import { exercerOpcaoCompra, loanLeft, loanOf, loansIn, loansOut, proporEmprestimo } from '../core/emprestimos.mjs';
import { P, S, clubById, table, userClub } from '../core/estado.mjs';
import { posDSigla } from '../core/posicoes.mjs';
import { esc, money } from '../core/utils.mjs';
import { save } from './estado.mjs';
import { closeModal, openModal } from './partida.mjs';
import { render } from './telas.mjs';

export function loanTag(p){
  const l=loanOf(p.id);if(!l)return '';
  const incoming=l.to===p.clubId,c=clubById(incoming?l.from:l.to);
  return ` <span class="pill" title="Salário pago por: ${l.payer==='from'?'quem cedeu':'quem recebeu'}">${incoming?'emprestado de':'emprestado a'} ${esc(c.name)} · até a rodada ${l.until}</span>`;
}
export function loanBtn(p,mode){
  if(loanOf(p.id))return '';
  return `<button class="btn sec sm" data-acao="loanForm|${p.id}|${mode}">Empréstimo</button>`;
}
export function loanForm(pid,mode){
  const p=P[pid],uc=userClub(),left=S.fixtures.length-S.round;
  if(left<1){alert('A temporada acabou.');return}
  const durs=[...new Set([5,10,19,left].filter(n=>n<=left))].sort((a,b)=>a-b);
  const clubSel=mode==='out'?`<label>Emprestar para <select id="lnClub">${S.clubs.filter(c=>c.id!==uc.id).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>`
    :`<p>Clube de origem: <b>${esc(clubById(p.clubId).name)}</b></p>`;
  openModal(`<h2>Empréstimo — ${esc(p.name)}</h2>
   <p class="muted">${posDSigla(p)} · força ${p.ovr} · valor ${money(p.value)} · salário ${money(p.wage)}/rod.</p>
   <div class="row" style="flex-direction:column;align-items:flex-start;gap:10px">${clubSel}
   <label>Duração <select id="lnDur">${durs.map(n=>`<option value="${n}">${n===left?'Até o fim da temporada ('+n+' rod.)':n+' rodadas'}</option>`).join('')}</select></label>
   <label>Quem paga o salário <select id="lnPay"><option value="to">${mode==='out'?'Clube que recebe':'Eu (clube que recebe)'}</option><option value="from">${mode==='out'?'Eu (clube que cede)':'Clube que cede'}</option></select></label>
   <label><input id="lnBuy" type="checkbox"> Opção de compra por <input id="lnBuyV" type="number" step="0.1" min="0.1" style="width:90px" value="${(p.value*1.1).toFixed(1)}"> mi</label></div>
   <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn sec" data-acao="closeModal">Cancelar</button><button class="btn" data-acao="submitLoan|${pid}|${mode}">Propor</button></div>`);
}
export function submitLoan(pid,mode){
  const v=id=>document.getElementById(id);
  const buy=v('lnBuy').checked?Math.round(parseFloat(v('lnBuyV').value)*10)/10:null;
  const r=proporEmprestimo({pid,mode,clubeId:mode==='out'?v('lnClub').value:null,dur:parseInt(v('lnDur').value),payer:v('lnPay').value,buy});
  if(r.erro){alert(r.erro);return}
  closeModal();save();render();alert(r.msg);
}
export function buyLoaned(pid){
  const l=loanOf(pid);if(!l||!l.buy)return;
  if(!confirm(`Exercer a opção de compra de ${P[pid].name} por ${money(l.buy)}?`))return;
  const r=exercerOpcaoCompra(pid);if(r.erro){alert(r.erro);return}save();render();
}
export function vLoans(){
  const uc=userClub(),inn=loansIn(uc),out=loansOut(uc);
  if(!inn.length&&!out.length)return '';
  const row=(l,isIn)=>{const p=P[l.pid];return `<tr><td><span class="pos ${p.pos}">${posDSigla(p)}</span> ${esc(p.name)}</td><td class="n ovr">${p.ovr}</td><td>${isIn?'de '+esc(clubById(l.from).name):'para '+esc(clubById(l.to).name)}</td><td>até a rodada ${l.until} (${loanLeft(l)} rod.)</td><td>Salário: ${l.payer==='from'?'clube que cede':'clube que recebe'}</td><td>${l.buy?'Opção de compra '+money(l.buy)+(isIn?` <button class="btn sm" data-acao="buyLoaned|${l.pid}">Comprar</button>`:''):'Sem opção de compra'}</td></tr>`};
  return `<div class="card tw"><h3>Empréstimos</h3>
   ${inn.length?`<p class="muted">Emprestados ao meu clube</p><table>${inn.map(l=>row(l,true)).join('')}</table>`:''}
   ${out.length?`<p class="muted">Emprestados pelo meu clube</p><table>${out.map(l=>row(l,false)).join('')}</table>`:''}</div>`;
}
