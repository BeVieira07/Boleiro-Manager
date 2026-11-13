/* ================= jogando a liga (#34) =================
   O estado da liga vem do servidor (liga_estado) e as telas do jogo o mostram como se fosse um save, com o técnico
   da vez = você. Escalação, formação e tática são ajustadas aqui e enviadas em "Confirmar rodada" (liga_entradas).
   Quem joga a rodada é a função jogar-rodada no servidor, quando todos confirmam ou o dono força. O tempo real avisa
   quem confirmou e quando a rodada foi jogada; aí o estado novo é baixado e o seu jogo aparece como replay.
   Nada da liga vai para os saves locais nem da nuvem. */
import { S, reindex, tecnicos, usarEstado, usarTecnico, userClub } from '../core/estado.mjs';
import { validateLineup } from '../core/motor.mjs';
import { taticaUser } from '../core/taticas.mjs';
import { esc } from '../core/utils.mjs';
import { avisar, confirmar } from './avisos.mjs';
import { clienteLogado, usuarioAtual } from './conta.mjs';
import { ui } from './estado.mjs';
import { icone } from './icones.mjs';
import { showLive } from './partida.mjs';
import { go, render } from './telas.mjs';

export const FUNCAO = 'jogar-rodada';
let canal = null;

/** Chama a função do servidor; erros viram aviso. */
async function chamarFuncao(corpo) {
  const c = clienteLogado(); if (!c) return null;
  const { data, error } = await c.functions.invoke(FUNCAO, { body: corpo });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.erro) msg = j.erro } catch { /* resposta sem JSON */ }
    avisar(msg, 'erro'); return null;
  }
  return data;
}

/** Na liga, o que mudaria o jogo só neste navegador fica bloqueado (o servidor é o dono do estado). */
export function bloqueadoNaLiga() {
  if (!ui.liga) return false;
  avisar('Na liga, mercado, empréstimos e temporada são resolvidos no servidor. Isso chega na próxima etapa (#35). Por enquanto, ajuste a escalação e a tática e confirme a rodada.', 'aviso');
  return true;
}

/** O dono começa a liga: o servidor monta o estado com os clubes de cada técnico. */
export function comecarLiga(id) {
  confirmar({ titulo: 'Começar a liga?', texto: 'Depois de começar, ninguém mais entra e os clubes ficam fixos.', ok: 'Começar' }, async () => {
    const r = await chamarFuncao({ liga: id, acao: 'iniciar' });
    if (r && r.iniciada) { avisar('A liga começou!', 'ok'); await entrarNaLiga(id) }
  });
}

async function carregar(id) {
  const c = clienteLogado(), eu = usuarioAtual() && usuarioAtual().id;
  const [l, e, en] = await Promise.all([
    c.from('ligas').select('id, nome, dono_id, status, rodada, versao').eq('id', id).maybeSingle(),
    c.from('liga_estado').select('estado').eq('liga_id', id).maybeSingle(),
    c.from('liga_entradas').select('user_id, pronto, rodada').eq('liga_id', id)
  ]);
  if (l.error || e.error || !l.data || !e.data) { avisar('Não foi possível abrir a liga.', 'erro'); return false }
  usarEstado(e.data.estado); reindex();
  if (S.managers[eu]) usarTecnico(eu);
  ui.liga = { ...(ui.liga && ui.liga.id === id ? ui.liga : {}), id, nome: l.data.nome, dono: l.data.dono_id === eu, rodada: l.data.rodada,
    prontos: (en.data || []).filter(x => x.pronto && x.rodada === l.data.rodada).map(x => x.user_id) };
  return true;
}

/** Abre a liga em andamento nas telas do jogo. */
export async function entrarNaLiga(id) {
  if (!clienteLogado()) { avisar('Entre na sua conta para jogar a liga.'); return }
  if (!(await carregar(id))) return;
  assinar(id);
  go('clube');
}

function assinar(id) {
  const c = clienteLogado(); if (!c || !c.channel) return;
  if (canal) c.removeChannel(canal);
  canal = c.channel('liga-' + id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'liga_entradas', filter: `liga_id=eq.${id}` }, p => {
      const n = p.new || {}; if (!ui.liga || !n.user_id) return;
      const s = new Set(ui.liga.prontos);
      if (n.pronto && n.rodada === ui.liga.rodada) s.add(n.user_id); else s.delete(n.user_id);
      ui.liga.prontos = [...s]; render();
    })
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ligas', filter: `id=eq.${id}` }, p => {
      if (ui.liga && p.new && p.new.rodada !== ui.liga.rodada) atualizarAposRodada();
    })
    .subscribe();
}
export function sairDaLiga() {
  const c = clienteLogado();
  if (canal && c) c.removeChannel(canal);
  canal = null; ui.liga = null;
}

/** A rodada foi jogada no servidor: baixa o estado novo e mostra o seu jogo como replay (uma vez só). */
export async function atualizarAposRodada() {
  const L = ui.liga; if (!L || L.atualizando) return;
  L.atualizando = true;
  const antes = L.rodada;
  try { if (!(await carregar(L.id))) return } finally { if (ui.liga) ui.liga.atualizando = false }
  if (ui.liga.rodada === antes) { render(); return }
  const { data: r } = await clienteLogado().from('liga_resultados').select('temporada, rodada, jogos').eq('liga_id', L.id)
    .order('temporada', { ascending: false }).order('rodada', { ascending: false }).limit(1).maybeSingle();
  if (!r) { render(); return }
  const fim = () => { ui.lastRound = { round: r.rodada + 1, games: r.jogos }; ui.view = 'rodada'; render() };
  const me = userClub().id, meu = r.jogos.find(g => g.h === me || g.a === me);
  if (meu) showLive(meu, fim, { replay: true }); else fim();
}

/** Envia a sua escalação, formação e tática da rodada e pede ao servidor para jogar (ele só joga quando todos confirmaram). */
export async function confirmarLiga() {
  const c = clienteLogado(), L = ui.liga, eu = usuarioAtual() && usuarioAtual().id; if (!c || !L || !eu) return;
  const uc = userClub(), err = validateLineup(uc);
  if (err) { avisar(err, 'erro'); go('escalacao'); return }
  const t = taticaUser(uc);
  const { error } = await c.from('liga_entradas').upsert({ liga_id: L.id, user_id: eu, rodada: L.rodada, escalacao: { lineup: uc.lineup },
    formacao: uc.formation, estilo: t.estilo, modo: t.modo, pronto: true, atualizado_em: new Date().toISOString() }, { onConflict: 'liga_id,user_id' });
  if (error) { avisar('A rodada já mudou. Atualizando a liga…', 'aviso'); await atualizarAposRodada(); return } // RLS recusa rodada velha
  if (!L.prontos.includes(eu)) L.prontos.push(eu);
  render();
  const r = await chamarFuncao({ liga: L.id, acao: 'jogar' });
  if (r && r.faltam) avisar(`Rodada confirmada. ${r.faltam === 1 ? 'Falta 1 técnico' : `Faltam ${r.faltam} técnicos`} confirmar.`, 'ok');
  else if (r && (r.jogada || r.jaJogada)) await atualizarAposRodada();
}
/** O dono joga a rodada sem esperar quem não confirmou (essas escalações são automáticas). */
export function forcarLiga() {
  const L = ui.liga; if (!L) return;
  confirmar({ titulo: 'Forçar a rodada?', texto: `Quem ainda não confirmou joga com a escalação automática.`, ok: 'Jogar a rodada' }, async () => {
    const r = await chamarFuncao({ liga: L.id, acao: 'jogar', forcar: true });
    if (r && (r.jogada || r.jaJogada)) await atualizarAposRodada();
  });
}

/** Botões da rodada na barra de ações, no lugar de "Jogar rodada". */
export function botaoLiga(cls) {
  const L = ui.liga, eu = usuarioAtual() && usuarioAtual().id, n = tecnicos().length, k = L.prontos.length;
  const meu = L.prontos.includes(eu)
    ? `<button class="${cls}" disabled>${icone('ok', { tam: 16 })}Confirmado · ${k} de ${n}</button>`
    : `<button class="${cls}" data-acao="confirmarLiga">${icone('ok', { tam: 16 })}Confirmar rodada ${S.round + 1}</button>`;
  return meu + (L.dono && k < n ? '<button class="btn sec" data-acao="forcarLiga">Forçar rodada</button>' : '');
}
/** Quem já confirmou, para a barra de ações. */
export const situacaoLiga = () => `<div class="vez">Liga <b>${esc(ui.liga.nome)}</b> ${tecnicos().map(t => { const ok = ui.liga.prontos.includes(t.id);
  return `<span class="pill" title="${ok ? 'confirmou' : 'falta confirmar'}">${ok ? icone('ok', { tam: 12, rotulo: 'confirmou' }) : '…'} ${esc(t.nome)}</span>` }).join(' ')}</div>`;
