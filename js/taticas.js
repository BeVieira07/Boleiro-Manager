/* ================= estilos de jogo e modo (ataque/defesa) ================= */
// att = multiplica os gols que o time cria; sof = multiplica os gols que o adversário cria;
// fad = desgaste: a eficiência cai (e a defesa se abre) ao longo dos 93 minutos.
const ESTILOS={
  equilibrado:{nome:'Equilibrado',desc:'Sem ajustes.',att:1,sof:1,fad:0.02},
  toque:{nome:'Toque de bola',desc:'Controla o jogo: cede menos chances, cria um pouco mais.',att:1.04,sof:0.94,fad:0.03},
  direto:{nome:'Jogo direto',desc:'Bola longa: mais finalizações, mas também mais espaço para o rival.',att:1.10,sof:1.06,fad:0.02},
  contra:{nome:'Contra-ataque',desc:'Defende fechado e sai rápido; rende muito contra times ofensivos.',att:0.96,sof:0.90,fad:0.03},
  laterais:{nome:'Jogo pelas laterais',desc:'Cruzamentos: ataque mais forte, laterais expostas e mais cansaço.',att:1.08,sof:1.04,fad:0.05}
};
const MODOS={
  ofensivo:{nome:'Ofensivo',desc:'Mais atacantes e risco maior.',att:1.25,sof:1.22,fad:0.06},
  equilibrado:{nome:'Equilibrado',desc:'Sem ajustes.',att:1,sof:1,fad:0},
  defensivo:{nome:'Defensivo',desc:'Time recuado: cria pouco, sofre pouco.',att:0.78,sof:0.78,fad:0.02}
};
// saves antigos não têm tática: assume o padrão
function taticaUser(club){
  const t=club.tatica||{};
  return {estilo:ESTILOS[t.estilo]?t.estilo:'equilibrado',modo:MODOS[t.modo]?t.modo:'equilibrado'};
}
// computador: modo pela diferença de força, estilo por sorteio fixo do clube
function autoTatica(club,opp){
  const a=power(club),b=power(opp),d=a.att+a.def-b.att-b.def;
  const modo=d>14?'ofensivo':d<-14?'defensivo':'equilibrado';
  const estilo=modo==='defensivo'?'contra':modo==='ofensivo'?'toque':['toque','direto','laterais','equilibrado'][hashStr(club.id)%4];
  return {estilo,modo};
}
function taticaDe(club,opp){return club.id===S.userClubId?taticaUser(club):autoTatica(club,opp)}
// multiplicadores de um time contra um adversário no minuto médio `mid`
function efeitoTatica(t,tOpp,mid){
  const e=ESTILOS[t.estilo],m=MODOS[t.modo],f=(e.fad+m.fad)*mid/93;
  let att=e.att*m.att*(1-f);
  if(t.estilo==='contra'&&tOpp.modo==='ofensivo')att*=1.15; // espaço nas costas do rival
  return {att,sof:e.sof*m.sof*(1+f)};
}
// gols esperados dos dois lados entre os minutos de..ate (lh/la = jogo todo, sem tática)
function golsSegmento(lh,la,tH,tA,de,ate){
  const mid=(de+ate)/2,n=(ate-de+1)/93,eh=efeitoTatica(tH,tA,mid),ea=efeitoTatica(tA,tH,mid);
  return {h:clamp(lh*eh.att*ea.sof,0.05,6)*n,a:clamp(la*ea.att*eh.sof,0.05,6)*n};
}
function novosGols(g,ph,pa,nh,na,de,ate){
  const gol=(side,xi)=>{if(!xi.length)return;const p=pickScorer(xi);p.goals=(p.goals||0)+1;g.ev.push({m:ri(de,ate),t:'gol',side,pid:p.id,name:p.name})};
  g.hg+=nh;g.ag+=na;
  for(let i=0;i<nh;i++)gol('h',ph.xi);for(let i=0;i<na;i++)gol('a',pa.xi);
}
function mudarTatica(campo,valor){
  const uc=userClub();uc.tatica=Object.assign(taticaUser(uc),{[campo]:valor});
}
// jogo ao vivo: refaz os gols dos minutos seguintes com a tática nova
function ressimularDepois(g,min){
  const H=clubById(g.h),A=clubById(g.a),uid=S.userClubId,ph=power(H),pa=power(A);
  const saldo=()=>g.h===uid?g.hg-g.ag:g.ag-g.hg,antes=saldo();
  g.ev=g.ev.filter(e=>{
    if(e.t!=='gol'||e.m<=min)return true;
    if(P[e.pid])P[e.pid].goals=Math.max(0,(P[e.pid].goals||0)-1);
    e.side==='h'?g.hg--:g.ag--;return false;
  });
  if(min<93){
    const s=golsSegmento(g.lh,g.la,taticaDe(H,A),taticaDe(A,H),min+1,93);
    novosGols(g,ph,pa,poisson(s.h),poisson(s.a),min+1,93);
    g.ev.sort((x,y)=>x.m-y.m);
  }
  // bicho por vitória foi lançado antes do jogo acabar: acerta se o resultado virou
  const bicho=Math.round(userClub().players.reduce((s,p)=>s+p.wage,0)*0.15*1000)/1000,depois=saldo();
  if(antes>0&&depois<=0)addFin('Bicho por vitória (ajuste)',bicho);
  if(antes<=0&&depois>0)addFin('Bicho por vitória (ajuste)',-bicho);
}

/* ---------- controles ---------- */
const optsTat=(obj,sel)=>Object.entries(obj).map(([k,v])=>`<option value="${k}" ${k===sel?'selected':''} title="${esc(v.desc)}">${v.nome}</option>`).join('');
function controlesTatica(cb){
  const t=taticaUser(userClub());
  return `<label>Estilo <select onchange="${cb}('estilo',this.value)">${optsTat(ESTILOS,t.estilo)}</select></label>
  <label>Modo <select onchange="${cb}('modo',this.value)">${optsTat(MODOS,t.modo)}</select></label>`;
}
function painelTatica(){
  const t=taticaUser(userClub());
  return `<div class="card"><h3>Estilo de jogo e modo</h3><div class="row">${controlesTatica('tvPainel')}</div>
  <p class="muted">${esc(ESTILOS[t.estilo].desc)} ${esc(MODOS[t.modo].desc)} Você também pode mudar durante a partida.</p></div>`;
}
function tvPainel(c,v){mudarTatica(c,v);save();render()}
let tvAoVivo=null; // {g,min()} do jogo ao vivo em andamento
function tvLive(c,v){mudarTatica(c,v);if(tvAoVivo)ressimularDepois(tvAoVivo.g,tvAoVivo.min());save()}
