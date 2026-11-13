import { userClub } from '../core/estado.mjs';
import { ESTILOS, MODOS, mudarTatica, ressimularDepois, taticaUser } from '../core/taticas.mjs';
import { esc } from '../core/utils.mjs';
import { save, ui } from './estado.mjs';
import { render } from './telas.mjs';

/* ---------- controles ---------- */
export const optsTat=(obj,sel)=>Object.entries(obj).map(([k,v])=>`<option value="${k}" ${k===sel?'selected':''} title="${esc(v.desc)}">${v.nome}</option>`).join('');
export function controlesTatica(cb){
  const t=taticaUser(userClub());
  return `<label>Estilo <select data-mudar="${cb}|estilo">${optsTat(ESTILOS,t.estilo)}</select></label>
  <label>Modo <select data-mudar="${cb}|modo">${optsTat(MODOS,t.modo)}</select></label>`;
}
export function painelTatica(){
  const t=taticaUser(userClub());
  return `<div class="card"><h3>Estilo de jogo e modo</h3><div class="row">${controlesTatica('tvPainel')}</div>
  <p class="muted">${esc(ESTILOS[t.estilo].desc)} ${esc(MODOS[t.modo].desc)} Você também pode mudar durante a partida.</p></div>`;
}
export function tvPainel(c,v){mudarTatica(c,v);save();render()}
export function tvLive(c,v){mudarTatica(c,v);if(ui.tvAoVivo)ressimularDepois(ui.tvAoVivo.g,ui.tvAoVivo.min());save()}
