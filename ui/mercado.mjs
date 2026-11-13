import { loanOf } from '../core/emprestimos.mjs';
import { P, S, clubById, userClub } from '../core/estado.mjs';
import { aceitarOferta, alternarVenda, podeProporCompra, proporCompra, recusarOferta, valorVendaRapida, venderJa } from '../core/mercado.mjs';
import { posDNome } from '../core/posicoes.mjs';
import { esc, money } from '../core/utils.mjs';
import { ovrChip } from './componentes.mjs';
import { loanBtn, loanTag } from './emprestimos.mjs';
import { save, ui } from './estado.mjs';
import { campoBusca, chipsGrupo, filtrar, mudarFiltro, th } from './jogadores.mjs';
import { crest } from './partida.mjs';
import { posTag } from './posicoes.mjs';
import { render } from './telas.mjs';

/* ================= Mercado (#63): mesma tabela do Elenco ================= */
const LIMITE = 120;
const listaMercado = () => {
  const uc = userClub(), f = ui.mf;
  let L = Object.values(P).filter(p => p.clubId !== uc.id);
  if (f.club) L = L.filter(p => p.clubId === f.club);
  const max = parseFloat(String(f.max).replace(',', '.'));
  if (max > 0) L = L.filter(p => p.value <= max);
  return L;
};
export function corpoMercado() {
  const L = filtrar(listaMercado(), ui.mf);
  const linhas = L.slice(0, LIMITE).map(p => { const c = clubById(p.clubId);
    return `<tr><td class="c-pos">${posTag(p)}</td><th scope="row" class="c-nome"><div class="jogador">${crest(c)}<div><b>${esc(p.name)}</b>${loanTag(p)}<span class="st">${esc(c.name)}</span></div></div></th>
    <td class="n c-idade"><span class="rot">Idade </span>${p.age}</td><td class="c c-ovr">${ovrChip(p.ovr)}</td><td class="n c-valor">${money(p.value)}</td><td class="n c-sal">${money(p.wage)}</td>
    <td class="c-acoes"><div class="acoes">${loanOf(p.id) ? '' : `<button class="btn sm" data-acao="makeBid|${p.id}">Proposta</button>${loanBtn(p, 'in')}`}</div></td></tr>` }).join('');
  return { linhas: linhas || '<tr><td colspan="7" class="muted">Nenhum jogador com esse filtro.</td></tr>', total: L.length };
}
const contagem = t => `${t} jogadores${t > LIMITE ? ` (mostrando os ${LIMITE} primeiros)` : ''}.`;
export function filtrarMercado(campo, valor) {
  mudarFiltro(ui.mf, campo, valor);
  const corpo = campo === 'q' && document.getElementById('corpoMercado');
  if (corpo && corpo.isConnected === true) { const r = corpoMercado(); corpo.innerHTML = r.linhas; document.getElementById('totalMercado').textContent = contagem(r.total) }
  else render();
}
export function vMercado() {
  const uc = userClub(), f = ui.mf, a = 'filtrarMercado', r = corpoMercado();
  return `<div class="filtros">${chipsGrupo(listaMercado(), f, a)}${campoBusca(f, a)}</div>
  <div class="filtros"><div class="row">
    <label class="sr" for="mClube">Clube</label><select id="mClube" data-mudar="${a}|club"><option value="">Todos os clubes</option>${S.clubs.filter(c => c.id !== uc.id).sort((x, y) => x.name.localeCompare(y.name)).map(c => `<option value="${c.id}" ${f.club === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>
    <label class="sr" for="mMax">Valor máximo em milhões</label><input id="mMax" inputmode="decimal" placeholder="Valor máx. (mi)" style="width:150px" value="${esc(f.max)}" data-mudar="${a}|max"></div>
    <div class="row"><span class="pill">Caixa <b>${money(uc.balance)}</b></span><span class="pill">Elenco ${uc.players.length}/32</span></div></div>
  <p class="muted resumo"><span id="totalMercado">${contagem(r.total)}</span> Craques do time vendedor custam mais caro. Uma proposta por jogador a cada rodada.</p>
  <section class="card tabela-card"><div class="tabela-rolavel"><table class="tabela-jogadores mercado"><caption class="sr">Jogadores de outros clubes</caption>
    <thead><tr>${th('Pos', 'pos', f, a)}${th('Jogador', 'nome', f, a, 'c-nome')}${th('Idade', 'idade', f, a, 'n')}${th('Força', 'ovr', f, a, 'c')}${th('Valor', 'valor', f, a, 'n')}${th('Salário', 'salario', f, a, 'n')}${th('Negociar', '', f, a)}</tr></thead>
    <tbody id="corpoMercado">${r.linhas}</tbody></table></div></section>`;
}

export function makeBid(pid){
  const p=P[pid],seller=clubById(p.clubId);
  const e=podeProporCompra(pid);if(e){alert(e);return}
  const s=prompt(`Proposta por ${p.name} (${posDNome(p)}, ${p.ovr}) do ${seller.name}.\nValor de mercado: ${money(p.value)}.\nSeu caixa: ${money(userClub().balance)}.\n\nQuanto oferecer (em milhões)?`,p.value.toFixed(1));
  if(s==null)return;
  const r=proporCompra(pid,parseFloat(String(s).replace(',','.')));
  alert(r.erro||r.msg);save();render();
}
// tela
export const feito=r=>{if(r.erro){alert(r.erro);return}save();render()};
export function acceptOffer(oid){feito(aceitarOferta(oid))}
export function rejectOffer(oid){feito(recusarOferta(oid))}
export function quickSell(pid){
  if(userClub().players.length<=16){alert('Seu elenco ficaria pequeno demais (mínimo 16).');return}
  if(!confirm(`Vender ${P[pid].name} agora por ${money(valorVendaRapida(pid))} (70% do valor)?`))return;
  feito(venderJa(pid));
}
export function toggleListed(pid){feito(alternarVenda(pid))}
