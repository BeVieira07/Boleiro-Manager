/* ================= escalação e força ================= */
function autoXI(club,formation){
  const f=FORMS[formation||club.formation||'4-4-2'];
  const by=pos=>club.players.filter(p=>p.pos===pos).sort((a,b)=>b.ovr-a.ovr);
  const xi=[];
  xi.push(...by('G').slice(0,1));
  xi.push(...by('D').slice(0,f[0]));xi.push(...by('M').slice(0,f[1]));xi.push(...by('A').slice(0,f[2]));
  const rest=club.players.filter(p=>!xi.includes(p)&&p.pos!=='G').sort((a,b)=>b.ovr-a.ovr);
  while(xi.length<11&&rest.length)xi.push(rest.shift());
  return xi.map(p=>p.id);
}
function getXI(club){
  if(club.id===S.userClubId){club.lineup=(club.lineup||[]).filter(id=>P[id]&&P[id].clubId===club.id);return club.lineup}
  return autoXI(club);
}
function power(club){
  const xi=getXI(club).map(id=>P[id]).filter(Boolean);
  const grp=pos=>xi.filter(p=>p.pos===pos);
  const avg=(arr,f)=>arr.length?arr.reduce((s,p)=>s+p.ovr,0)/arr.length:f;
  const base=avg(xi,45),g=grp('G'),d=grp('D'),m=grp('M'),a=grp('A');
  let def=0.30*avg(g,30)+0.45*avg(d,base-10)+0.25*avg(m,base-10);
  let att=0.55*avg(a,base-12)+0.35*avg(m,base-10)+0.10*avg(d,base-10);
  let mid=avg(m,base-10);
  att+=(a.length-2)*1.5-(d.length-4)*1.0; def+=(d.length-4)*1.2-(a.length-2)*1.2; mid+=(m.length-4)*1.2;
  if(d.length<3)def-=(3-d.length)*3; if(!a.length)att-=6;
  const miss=11-xi.length; if(miss>0){att-=miss*4;def-=miss*4;mid-=miss*4}
  return {att:Math.max(25,att),def:Math.max(25,def),mid:Math.max(25,mid),xi};
}
function pickScorer(xi){
  const w={G:0.02,D:0.8,M:2.6,A:6};
  const ws=xi.map(p=>w[p.pos]*Math.pow(p.ovr/70,2));const tot=ws.reduce((a,b)=>a+b,0);
  let x=rnd()*tot;for(let i=0;i<xi.length;i++){x-=ws[i];if(x<=0)return xi[i]}return xi[xi.length-1];
}
function simulate(g){
  const H=clubById(g.h),A=clubById(g.a),ph=power(H),pa=power(A);
  const lh=clamp(1.1*Math.pow(ph.att/pa.def,3)*Math.pow(ph.mid/pa.mid,0.8)*1.12,0.15,4.5);
  const la=clamp(1.1*Math.pow(pa.att/ph.def,3)*Math.pow(pa.mid/ph.mid,0.8)*0.9,0.15,4.5);
  g.hg=poisson(lh);g.ag=poisson(la);
  const ev=[];
  const goal=(side,xi)=>{if(!xi.length)return;const p=pickScorer(xi);p.goals=(p.goals||0)+1;ev.push({m:ri(1,93),t:'gol',side,pid:p.id,name:p.name})};
  for(let i=0;i<g.hg;i++)goal('h',ph.xi);for(let i=0;i<g.ag;i++)goal('a',pa.xi);
  for(const [side,xi] of [['h',ph.xi],['a',pa.xi]])for(let k=ri(0,3);k>0;k--){if(!xi.length)break;const p=pick(xi);ev.push({m:ri(5,90),t:'cartao',side,name:p.name})}
  ev.sort((x,y)=>x.m-y.m);g.ev=ev;
  return g;
}

/* ================= rodada ================= */
function validateLineup(){
  const uc=userClub(),xi=getXI(uc);
  if(xi.length!==11)return `Sua escalação tem ${xi.length} jogadores. Escolha exatamente 11 titulares.`;
  if(xi.filter(id=>P[id].pos==='G').length!==1)return 'Escale exatamente 1 goleiro.';
  return null;
}
function playRound(){
  if(S.round>=S.fixtures.length)return;
  const err=validateLineup();if(err){alert(err);view='elenco';render();return}
  const games=S.fixtures[S.round].map(simulate);
  const uc=userClub();
  // finanças do usuário
  addFin(`Cota de TV — rodada ${S.round+1}`,1.2);
  const mine=games.find(g=>g.h===uc.id||g.a===uc.id);
  if(mine&&mine.h===uc.id){
    const pos=table().findIndex(t=>t.id===uc.id);
    const bonus=pos<4?1.3:pos<10?1.1:1;
    addFin(`Bilheteria vs ${clubById(mine.a).name}`,Math.round((0.5+(uc.strength-60)*0.06)*bonus*100)/100);
  }
  const wages=uc.players.reduce((s,p)=>s+p.wage,0);
  addFin('Salários do elenco',-Math.round(wages*1000)/1000);
  if(mine){const gf=mine.h===uc.id?mine.hg:mine.ag,ga=mine.h===uc.id?mine.ag:mine.hg;if(gf>ga)addFin('Bicho por vitória',-Math.round(wages*0.15*1000)/1000)}
  // ofertas por jogadores à venda
  S.offers=S.offers.filter(o=>o.until>S.round);
  for(const p of uc.players.filter(p=>p.listed)){
    if(rnd()<0.35){
      const buyers=S.clubs.filter(c=>c.id!==uc.id&&c.players.length<32);
      if(buyers.length){const b=pick(buyers);const amt=Math.round(p.value*(0.75+rnd()*0.5)*10)/10;
        S.offers.push({id:'o'+Date.now()+Math.floor(rnd()*1e4),pid:p.id,from:b.id,amount:amt,until:S.round+3});
        addNews(`💼 ${b.name} ofereceu ${money(amt)} por ${p.name}.`);}
    }
  }
  S.round++;
  if(S.balance<0)addNews('⚠️ Caixa negativo! Venda jogadores para equilibrar as contas.');
  lastRound={round:S.round,games};
  save();
  if(mine)showLive(mine,()=>{view='rodada';render();if(S.round>=S.fixtures.length)seasonEnd()});
  else{view='rodada';render();}
}
function simToEnd(){
  if(!confirm('Simular todas as rodadas restantes sem assistir aos jogos?'))return;
  while(S.round<S.fixtures.length){
    const err=validateLineup();if(err){userClub().lineup=autoXI(userClub())}
    const saveLive=showLive;showLive=(g,cb)=>{};playRound();showLive=saveLive;
  }
  view='tabela';render();seasonEnd();
}

