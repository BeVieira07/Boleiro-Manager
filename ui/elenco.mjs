/* ================= Elenco como tabela moderna (#60) =================
   Filtros por grupo com contagem, busca, ordenação por coluna, cabeçalho e coluna do jogador fixos,
   força em chip com a tendência, barra de forma e as ações de mercado. No celular cada linha vira um cartão. */
import { loanOf, wageBill } from '../core/emprestimos.mjs';
import { unavailable } from '../core/escalacao.mjs';
import { userClub } from '../core/estado.mjs';
import { getXI } from '../core/motor.mjs';
import { esc, money } from '../core/utils.mjs';
import { barra, ovrChip } from './componentes.mjs';
import { loanBtn, loanTag, vLoans } from './emprestimos.mjs';
import { ui } from './estado.mjs';
import { tendenciaTag } from './forma.mjs';
import { icone } from './icones.mjs';
import { campoBusca, chipsGrupo, filtrar, mudarFiltro, pctForma, th } from './jogadores.mjs';
import { posTag } from './posicoes.mjs';
import { render } from './telas.mjs';

const corForma = v => (v >= 60 ? 'var(--verde)' : v >= 35 ? 'var(--ouro)' : 'var(--perigo)');

function status(p, tit) {
  const u = unavailable(p);
  if (u) return `<span class="st erro">${icone('lesao', { tam: 12 })}${esc(u[0].toUpperCase() + u.slice(1))}</span>`;
  if (p.listed) return '<span class="st aviso">À venda</span>';
  return `<span class="st ${tit ? 'ok' : ''}">${tit ? 'Titular' : 'Reserva'}</span>`;
}

function linha(p, xi) {
  const tit = xi.includes(p.id), f = pctForma(p);
  const acoes = loanOf(p.id) ? '' : `<button class="btn sm ${p.listed ? 'perigo' : 'sec'}" data-acao="toggleListed|${p.id}" aria-pressed="${!!p.listed}">${p.listed ? 'À venda' : 'Pôr à venda'}</button><button class="btn sec sm" data-acao="quickSell|${p.id}">Vender já</button>`;
  return `<tr class="${tit ? 'tit' : ''}${unavailable(p) ? ' indisp' : ''}">
    <td class="c-pos">${posTag(p)}</td>
    <th scope="row" class="c-nome"><div class="jogador"><span class="camisa" aria-hidden="true">${p.number ?? ''}</span>${p.number != null ? `<span class="sr">camisa ${p.number}, </span>` : ''}<div><b>${esc(p.name)}</b>${loanTag(p)}${status(p, tit)}</div></div></th>
    <td class="n c-idade"><span class="rot">Idade </span>${p.age}</td>
    <td class="c c-ovr"><span class="forca">${ovrChip(p.ovr)}${tendenciaTag(p)}</span></td>
    <td class="c-forma" title="Forma: ${f}%"><span class="sr">Forma ${f}%</span>${barra(f, corForma(f), 'fina')}</td>
    <td class="n c-gols"><span class="rot">Gols </span>${p.goals || 0}</td>
    <td class="n c-valor">${money(p.value)}</td>
    <td class="n c-sal">${money(p.wage)}</td>
    <td class="c-acoes"><div class="acoes">${acoes}${loanBtn(p, 'out')}</div></td></tr>`;
}

export const corpoElenco = () => { const uc = userClub(), xi = getXI(uc); return filtrar(uc.players, ui.ef).map(p => linha(p, xi)).join('') || '<tr><td colspan="9" class="muted">Nenhum jogador com esse filtro.</td></tr>' };

/** Filtro do elenco: chips e colunas redesenham a tela; a busca só troca as linhas, para não perder o foco do campo. */
export function filtrarElenco(campo, valor) {
  mudarFiltro(ui.ef, campo, valor);
  const corpo = campo === 'q' && document.getElementById('corpoElenco');
  if (corpo && corpo.isConnected === true) corpo.innerHTML = corpoElenco(); else render();
}

export function vElenco() {
  const uc = userClub(), f = ui.ef, a = 'filtrarElenco';
  return `<div class="filtros">${chipsGrupo(uc.players, f, a)}${campoBusca(f, a)}
    <button class="btn sec" data-acao="go|escalacao">${icone('escalacao', { tam: 16 })}Mudar escalação</button></div>
  <p class="muted resumo">${uc.players.length} jogadores · folha de ${money(wageBill(uc))} por rodada · titulares em destaque. A escalação é feita na tela de Escalação.</p>
  <section class="card tabela-card"><div class="tabela-rolavel"><table class="tabela-jogadores">
    <caption class="sr">Elenco do ${esc(uc.name)}</caption>
    <thead><tr>${th('Pos', 'pos', f, a)}${th('Jogador', 'nome', f, a, 'c-nome')}${th('Idade', 'idade', f, a, 'n')}${th('Força', 'ovr', f, a, 'c')}${th('Forma', 'forma', f, a)}${th('Gols', 'gols', f, a, 'n')}${th('Valor', 'valor', f, a, 'n')}${th('Salário', 'salario', f, a, 'n')}${th('Mercado', '', f, a)}</tr></thead>
    <tbody id="corpoElenco">${corpoElenco()}</tbody></table></div></section>
  <p class="muted nota">As setas mostram a variação do overall desde o início da temporada. A barra de forma sobe com bons jogos e cai no banco.</p>
  ${vLoans()}`;
}
