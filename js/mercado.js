/* ================= transferências ================= */
function movePlayer(p,to){
  const from=clubById(p.clubId);from.players=from.players.filter(x=>x!==p);
  if(from.lineup)from.lineup=from.lineup.filter(id=>id!==p.id);
  to.players.push(p);p.clubId=to.id;p.listed=false;
  S.offers=S.offers.filter(o=>o.pid!==p.id);
  ensureSquad(from);
}
function makeBid(pid){
  const p=P[pid],seller=clubById(p.clubId),uc=userClub();
  if(p.bidRound===S.round+'_'+S.season){alert(`${seller.name} não quer negociar ${p.name} de novo nesta rodada.`);return}
  if(uc.players.length>=32){alert('Seu elenco já tem 32 jogadores. Venda alguém antes.');return}
  const s=prompt(`Proposta por ${p.name} (${posDNome(p)}, ${p.ovr}) do ${seller.name}.\nValor de mercado: ${money(p.value)}.\nSeu caixa: ${money(S.balance)}.\n\nQuanto oferecer (em milhões)?`,p.value.toFixed(1));
  if(s==null)return;const amt=parseFloat(String(s).replace(',','.'));
  if(!(amt>0)){alert('Valor inválido.');return}
  if(amt>S.balance){alert('Caixa insuficiente.');return}
  p.bidRound=S.round+'_'+S.season;
  const best=[...seller.players].sort((a,b)=>b.ovr-a.ovr).slice(0,3).includes(p);
  const need=p.value*(best?1.3:1);
  const prob=amt>=need*1.25?1:amt>=need?0.65:amt>=need*0.85?0.2:0;
  const sameP=seller.players.filter(x=>x.pos===p.pos).length;
  if(sameP<=(p.pos==='G'?2:3)){alert(`${seller.name} recusou: não pode ficar sem reposição na posição.`);save();return}
  if(rnd()<prob){
    addFin(`Compra de ${p.name} (${seller.name})`,-amt);movePlayer(p,uc);
    addNews(`✅ Contratado: ${p.name} por ${money(amt)}.`);alert(`Negócio fechado! ${p.name} é do ${uc.name}.`);
  }else{addNews(`❌ ${seller.name} recusou ${money(amt)} por ${p.name}.`);alert(`${seller.name} recusou a proposta.`)}
  save();render();
}
function acceptOffer(oid){
  const o=S.offers.find(x=>x.id===oid);if(!o)return;const p=P[o.pid],b=clubById(o.from);
  if(userClub().players.length<=16){alert('Seu elenco ficaria pequeno demais (mínimo 16).');return}
  addFin(`Venda de ${p.name} (${b.name})`,o.amount);movePlayer(p,b);
  addNews(`💰 ${p.name} vendido ao ${b.name} por ${money(o.amount)}.`);save();render();
}
function rejectOffer(oid){S.offers=S.offers.filter(o=>o.id!==oid);save();render()}
function quickSell(pid){
  const p=P[pid],uc=userClub();
  if(uc.players.length<=16){alert('Seu elenco ficaria pequeno demais (mínimo 16).');return}
  const amt=Math.round(p.value*0.7*10)/10;
  if(!confirm(`Vender ${p.name} agora por ${money(amt)} (70% do valor)?`))return;
  const buyers=S.clubs.filter(c=>c.id!==uc.id&&c.players.length<32);const b=pick(buyers);
  addFin(`Venda de ${p.name} (${b.name})`,amt);movePlayer(p,b);addNews(`💰 ${p.name} vendido ao ${b.name} por ${money(amt)}.`);save();render();
}

