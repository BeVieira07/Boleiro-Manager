/* ================= empréstimos ================= */
// S.loans = [{pid, from, to, until, payer:'from'|'to', buy:preço|null}]
// from = clube dono, to = clube que recebeu, until = rodada (S.round) em que o jogador volta, payer = quem paga o salário
const loans=()=>S.loans||(S.loans=[]);
const loanOf=pid=>loans().find(l=>l.pid===pid);
const loansOut=c=>loans().filter(l=>l.from===c.id);
const loansIn=c=>loans().filter(l=>l.to===c.id);
const loanLeft=l=>Math.max(0,l.until-S.round);
// folha salarial real do clube: quem paga o salário do emprestado arca com ele
function wageBill(c){
  let w=0;
  for(const p of c.players){const l=loanOf(p.id);if(!(l&&l.to===c.id&&l.payer==='from'))w+=p.wage}
  for(const l of loansOut(c))if(l.payer==='from'&&P[l.pid])w+=P[l.pid].wage;
  return w;
}
function loanTag(p){
  const l=loanOf(p.id);if(!l)return '';
  const incoming=l.to===p.clubId,c=clubById(incoming?l.from:l.to);
  return ` <span class="pill" title="Salário pago por: ${l.payer==='from'?'quem cedeu':'quem recebeu'}">${incoming?'emprestado de':'emprestado a'} ${esc(c.name)} · até a rodada ${l.until}</span>`;
}
function loanBtn(p,mode){
  if(loanOf(p.id))return '';
  return `<button class="btn sec sm" onclick="loanForm('${p.id}','${mode}')">Empréstimo</button>`;
}
function loanForm(pid,mode){
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
   <div class="row" style="justify-content:flex-end;margin-top:14px"><button class="btn sec" onclick="closeModal()">Cancelar</button><button class="btn" onclick="submitLoan('${pid}','${mode}')">Propor</button></div>`);
}
// regra: proposta de empréstimo. Devolve {erro} ou {ok, msg}. mode 'out' = emprestar meu jogador; 'in' = pegar emprestado.
function proporEmprestimo({pid,mode,clubeId,dur,payer,buy}){
  const p=P[pid],uc=userClub();
  if(buy!=null&&!(buy>0))return {erro:'Valor da opção de compra inválido.'};
  const lender=mode==='out'?uc:clubById(p.clubId),borrower=mode==='out'?clubById(clubeId):uc;
  const l={pid,from:lender.id,to:borrower.id,until:Math.min(S.round+dur,S.fixtures.length),payer,buy:buy??null};
  const err=loanCheck(p,lender,borrower);if(err)return {erro:err};
  const other=mode==='out'?borrower:lender;
  if(rnd()>=loanChance(p,lender,borrower,l,mode)){addNews(`❌ ${other.name} recusou o empréstimo de ${p.name}.`);return {ok:false,msg:`${other.name} recusou a proposta de empréstimo.`}}
  startLoan(l);return {ok:true,msg:`Empréstimo fechado! ${p.name} vai do ${lender.name} para o ${borrower.name} até a rodada ${l.until}.`};
}
function submitLoan(pid,mode){
  const v=id=>document.getElementById(id);
  const buy=v('lnBuy').checked?Math.round(parseFloat(v('lnBuyV').value)*10)/10:null;
  const r=proporEmprestimo({pid,mode,clubeId:mode==='out'?v('lnClub').value:null,dur:parseInt(v('lnDur').value),payer:v('lnPay').value,buy});
  if(r.erro){alert(r.erro);return}
  closeModal();save();render();alert(r.msg);
}
function loanCheck(p,lender,borrower){
  if(loanOf(p.id))return `${p.name} já está emprestado.`;
  if(borrower.players.length>=32)return `${borrower.name} já tem 32 jogadores.`;
  if(lender.id===S.userClubId&&lender.players.length<=16)return 'Seu elenco ficaria pequeno demais (mínimo 16).';
  if(lender.id!==S.userClubId){
    if(p.bidRound===S.round+'_'+S.season)return `${lender.name} não quer negociar ${p.name} de novo nesta rodada.`;
    p.bidRound=S.round+'_'+S.season;
    if(lender.players.filter(x=>x.pos===p.pos).length<=(p.pos==='G'?2:3))return `${lender.name} recusou: não pode ficar sem reposição na posição.`;
  }
  return null;
}
function loanChance(p,lender,borrower,l,mode){
  if(mode==='out'){ // clube de IA recebe: quer jogador que ajude e, de preferência, sem pagar o salário
    const top=[...borrower.players].sort((a,b)=>b.ovr-a.ovr).slice(0,11),avg=top.reduce((s,x)=>s+x.ovr,0)/top.length;
    return clamp(0.5+(p.ovr-avg)/15+(l.payer==='from'?0.25:-0.1),0,0.95);
  }
  const best=[...lender.players].sort((a,b)=>b.ovr-a.ovr).slice(0,3).includes(p);
  return clamp((best?0.2:0.7)+(l.payer==='to'?0.2:-0.3)+(l.buy?0.1:0),0.05,0.95);
}
function startLoan(l){
  const p=P[l.pid];movePlayer(p,clubById(l.to)); // movePlayer garante o elenco mínimo de quem cedeu
  loans().push(l);
  addNews(`🤝 ${p.name} emprestado do ${clubById(l.from).name} ao ${clubById(l.to).name} até a rodada ${l.until}.`);
}
function endLoan(l,back){ // back: devolve ao clube de origem
  S.loans=loans().filter(x=>x!==l);
  const p=P[l.pid];if(!p||!back)return;
  const from=clubById(l.from),to=clubById(l.to);
  movePlayer(p,from);ensureSquad(to);
  if(from.id===S.userClubId||to.id===S.userClubId)addNews(`🔙 ${p.name} voltou ao ${from.name} (fim do empréstimo).`);
}
// chamada a cada rodada, depois de S.round++
function processLoans(){
  for(const l of [...loans()]){
    if(S.round<l.until)continue;
    const p=P[l.pid];
    if(l.buy&&p&&l.from===S.userClubId&&rnd()<0.4){ // clube de IA exerce a opção de compra
      addFin(`Opção de compra de ${p.name} (${clubById(l.to).name})`,l.buy);addNews(`💰 ${clubById(l.to).name} exerceu a opção de compra de ${p.name} por ${money(l.buy)}.`);
      S.loans=loans().filter(x=>x!==l);continue;
    }
    endLoan(l,true);
  }
}
// regra: exerce a opção de compra de um jogador que peguei emprestado
function exercerOpcaoCompra(pid){
  const l=loanOf(pid),p=P[pid];if(!l||!l.buy||l.to!==S.userClubId)return {erro:'Sem opção de compra.'};
  if(l.buy>S.balance)return {erro:'Caixa insuficiente.'};
  addFin(`Compra de ${p.name} (opção de compra, ${clubById(l.from).name})`,-l.buy);
  S.loans=loans().filter(x=>x!==l);addNews(`✅ Opção de compra exercida: ${p.name} por ${money(l.buy)}.`);return {ok:true};
}
function buyLoaned(pid){
  const l=loanOf(pid);if(!l||!l.buy)return;
  if(!confirm(`Exercer a opção de compra de ${P[pid].name} por ${money(l.buy)}?`))return;
  const r=exercerOpcaoCompra(pid);if(r.erro){alert(r.erro);return}save();render();
}
function vLoans(){
  const uc=userClub(),inn=loansIn(uc),out=loansOut(uc);
  if(!inn.length&&!out.length)return '';
  const row=(l,isIn)=>{const p=P[l.pid];return `<tr><td><span class="pos ${p.pos}">${posDSigla(p)}</span> ${esc(p.name)}</td><td class="n ovr">${p.ovr}</td><td>${isIn?'de '+esc(clubById(l.from).name):'para '+esc(clubById(l.to).name)}</td><td>até a rodada ${l.until} (${loanLeft(l)} rod.)</td><td>Salário: ${l.payer==='from'?'clube que cede':'clube que recebe'}</td><td>${l.buy?'Opção de compra '+money(l.buy)+(isIn?` <button class="btn sm" onclick="buyLoaned('${l.pid}')">Comprar</button>`:''):'Sem opção de compra'}</td></tr>`};
  return `<div class="card tw"><h3>Empréstimos</h3>
   ${inn.length?`<p class="muted">Emprestados ao meu clube</p><table>${inn.map(l=>row(l,true)).join('')}</table>`:''}
   ${out.length?`<p class="muted">Emprestados pelo meu clube</p><table>${out.map(l=>row(l,false)).join('')}</table>`:''}</div>`;
}
