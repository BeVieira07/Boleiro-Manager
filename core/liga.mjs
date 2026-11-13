/* ================= liga com amigos: regras do servidor (#34) =================
   O que a função jogar-rodada (supabase/functions/jogar-rodada) roda: montar o estado da liga e jogar uma rodada
   com as escolhas de cada técnico. Puro (sem rede nem DOM), para ser testado no Node e rodar igual no Deno.
   Atenção: usa o estado global do core (S). Quem chama precisa fazer usarEstado -> regra -> JSON.stringify(S)
   num bloco síncrono, sem await no meio (várias requisições podem dividir o mesmo processo). */
import { unavailable } from './escalacao.mjs';
import { S, clubDo, criarJogo, reindex, tecnicos, usarEstado } from './estado.mjs';
import { autoXI, jogarRodada, validateLineup } from './motor.mjs';
import { fecharTemporada, iniciarTemporada } from './partida.mjs';
import { ESTILOS, MODOS } from './taticas.mjs';
import { FORMS } from './utils.mjs';

export const SERIES = ['A', 'B', 'C', 'D'];

/** Séries escolhidas pelo dono: sem buracos (A+C não), porque acesso e rebaixamento valem entre séries vizinhas. */
export function erroSeries(series) {
  const i = [...new Set(series || [])].map(s => SERIES.indexOf(s)).sort((a, b) => a - b);
  if (!i.length || i[0] < 0) return 'Escolha pelo menos uma série válida.';
  if (i.some((v, k) => k && v !== i[k - 1] + 1)) return 'As séries da liga precisam ser vizinhas (ex.: A e B, ou B, C e D).';
  return null;
}

/** Monta o estado da liga. membros: [{user_id, nome, club_id}]. Devolve {erro} ou {ok} (o estado fica em S). */
export function iniciarLiga(membros, series, dados) {
  const e = erroSeries(series); if (e) return { erro: e };
  const clubs = dados.clubs.filter(c => series.includes(c.division));
  if (!membros.length) return { erro: 'A liga não tem técnicos.' };
  for (const m of membros) {
    if (!m.club_id) return { erro: `${m.nome || 'Um técnico'} ainda não escolheu o clube.` };
    if (!clubs.some(c => c.id === m.club_id)) return { erro: `O clube de ${m.nome || 'um técnico'} não é das séries da liga.` };
  }
  criarJogo(membros.map(m => ({ id: m.user_id, nome: m.nome || 'Técnico', clubId: m.club_id })), { ...dados, clubs });
  return { ok: true };
}

/** Aplica a escolha de um técnico, conferindo tudo (vem do navegador): 11 jogadores do clube, disponíveis e sem repetir. */
export function aplicarEntrada(uc, e) {
  if (FORMS[e.formacao]) uc.formation = e.formacao;
  const ids = Array.isArray(e.escalacao && e.escalacao.lineup) ? e.escalacao.lineup : [];
  const doClube = new Set(uc.players.map(p => p.id));
  const ok = ids.length === 11 && new Set(ids).size === 11 && ids.every(id => doClube.has(id) && !unavailable(uc.players.find(p => p.id === id)));
  uc.lineup = ok ? [...ids] : autoXI(uc);
  uc.tatica = { estilo: ESTILOS[e.estilo] ? e.estilo : 'equilibrado', modo: MODOS[e.modo] ? e.modo : 'equilibrado' };
}

/** Joga a rodada atual da liga. entradas: {user_id: linha de liga_entradas}. Quem não confirmou joga com a escalação automática.
 *  Depois da última rodada, fecha a temporada e começa a próxima na mesma chamada. */
export function jogarRodadaLiga(estado, entradas) {
  usarEstado(estado); reindex();
  for (const t of tecnicos()) {
    const uc = clubDo(t), e = entradas[t.id];
    if (e && e.pronto) aplicarEntrada(uc, e);
    if (validateLineup(uc)) uc.lineup = autoXI(uc);
    // shortcut: na liga ninguém é demitido por enquanto (zera a sequência de confiança baixa); a demissão na liga é a #37
    t.demitido = false; t.confBaixa = 0;
    t.pronto = true;
  }
  S.atual = tecnicos()[0].id;
  const temporada = S.season, rodada = S.round, semente = S.seed;
  const r = jogarRodada();
  if (!r.jogos) throw new Error('A rodada não foi jogada: ' + JSON.stringify(r)); // com as correções acima não acontece
  let virada = null;
  if (S.round >= S.fixtures.length) {
    const f = fecharTemporada();
    virada = { temporada, campeoes: f ? f.champs.map(x => ({ serie: x.d, clube: x.c.name })) : [] };
    iniciarTemporada();
  }
  return { jogos: r.jogos, temporada, rodada, semente, virada };
}
