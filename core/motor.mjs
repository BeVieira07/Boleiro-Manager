import { atualizarConfianca } from './diretoria.mjs';
import { processLoans, wageBill } from './emprestimos.mjs';
import { aplicarDisponibilidade, autoSlotXI, slotsDe, unavailable } from './escalacao.mjs';
import { P, S, addFin, addNews, clubById, divOf, table, tvQuota, userClub } from './estado.mjs';
import { atualizarForma } from './forma.mjs';
import { ovrNaPosicao } from './posicoes.mjs';
import { golsSegmento, novosGols, taticaDe } from './taticas.mjs';
import { clamp, money, pick, poisson, ri, rnd, semente } from './utils.mjs';

/* ================= escalação e força ================= */
export function autoXI(club,formation){return autoSlotXI(club,formation)} // em escalacao.js: já na ordem das vagas
export function getXI(club){
  if(club.id===S.userClubId){club.lineup=(club.lineup||[]).filter(id=>P[id]&&P[id].clubId===club.id);return club.lineup}
  return autoXI(club);
}
export function power(club){
  const xi=getXI(club).map(id=>P[id]).filter(Boolean);
  // com 11 titulares na ordem das vagas, quem joga fora de posição rende menos
  const sl=xi.length===11?slotsDe(club.formation||'4-4-2'):null;
  const xe=xi.map((p,i)=>({pos:p.pos,ovr:sl?ovrNaPosicao(p,sl[i]):p.ovr}));
  const grp=pos=>xe.filter(p=>p.pos===pos);
  const avg=(arr,f)=>arr.length?arr.reduce((s,p)=>s+p.ovr,0)/arr.length:f;
  const base=avg(xe,45),g=grp('G'),d=grp('D'),m=grp('M'),a=grp('A');
  let def=0.30*avg(g,30)+0.45*avg(d,base-10)+0.25*avg(m,base-10);
  let att=0.55*avg(a,base-12)+0.35*avg(m,base-10)+0.10*avg(d,base-10);
  let mid=avg(m,base-10);
  att+=(a.length-2)*1.5-(d.length-4)*1.0; def+=(d.length-4)*1.2-(a.length-2)*1.2; mid+=(m.length-4)*1.2;
  if(d.length<3)def-=(3-d.length)*3; if(!a.length)att-=6;
  const miss=11-xi.length; if(miss>0){att-=miss*4;def-=miss*4;mid-=miss*4}
  return {att:Math.max(25,att),def:Math.max(25,def),mid:Math.max(25,mid),xi};
}
export function pickScorer(xi){
  const w={G:0.02,D:0.8,M:2.6,A:6};
  const ws=xi.map(p=>w[p.pos]*Math.pow(p.ovr/70,2));const tot=ws.reduce((a,b)=>a+b,0);
  let x=rnd()*tot;for(let i=0;i<xi.length;i++){x-=ws[i];if(x<=0)return xi[i]}return xi[xi.length-1];
}
export function simulate(g){
  const H=clubById(g.h),A=clubById(g.a),ph=power(H),pa=power(A);
  const lh=clamp(1.1*Math.pow(ph.att/pa.def,3)*Math.pow(ph.mid/pa.mid,0.8)*1.12,0.15,4.5);
  const la=clamp(1.1*Math.pow(pa.att/ph.def,3)*Math.pow(pa.mid/ph.mid,0.8)*0.9,0.15,4.5);
  g.lh=lh;g.la=la;g.hg=0;g.ag=0;g.ev=[]; // estilo e modo entram em golsSegmento (taticas.js)
  const sg=golsSegmento(lh,la,taticaDe(H,A),taticaDe(A,H),1,93);
  novosGols(g,ph,pa,poisson(sg.h),poisson(sg.a),1,93);
  const ev=g.ev;
  for(const [side,xi] of [['h',ph.xi],['a',pa.xi]])for(let k=ri(0,3);k>0;k--){if(!xi.length)break;const p=pick(xi);ev.push({m:ri(5,90),t:'cartao',side,name:p.name})}
  ev.sort((x,y)=>x.m-y.m);g.ev=ev;
  return g;
}

/* ================= rodada ================= */
export function validateLineup(){
  const uc=userClub(),xi=getXI(uc);
  if(xi.length!==11)return `Sua escalação tem ${xi.length} jogadores. Escolha exatamente 11 titulares.`;
  if(xi.filter(id=>P[id].pos==='G').length!==1)return 'Escale exatamente 1 goleiro.';
  const ind=xi.map(id=>P[id]).filter(unavailable);
  if(ind.length)return `Jogador(es) indisponível(is) na escalação: ${ind.map(p=>p.name+' ('+unavailable(p)+')').join(', ')}.`;
  return null;
}
// regra: joga a rodada atual. Devolve {erro}, {demitido}, {fim} ou {jogos, meu}.
export function jogarRodada(){
  if(S.demitido)return {demitido:true};
  if(S.round>=S.fixtures.length)return {fim:true};
  const erro=validateLineup();if(erro)return {erro};
  S.rng=semente(S.seed,S.season,S.round); // a rodada depende só do estado e das escolhas, não do que foi sorteado antes
  const games=S.fixtures[S.round].map(simulate);
  aplicarDisponibilidade(games);
  atualizarForma(games);
  const uc=userClub();
  // finanças do usuário
  addFin(`Cota de TV — rodada ${S.round+1}`,tvQuota(divOf(uc)));
  const mine=games.find(g=>g.h===uc.id||g.a===uc.id);
  if(mine&&mine.h===uc.id){
    const pos=table().findIndex(t=>t.id===uc.id);
    const bonus=pos<4?1.3:pos<10?1.1:1;
    addFin(`Bilheteria vs ${clubById(mine.a).name}`,Math.round((0.5+(uc.strength-60)*0.06)*bonus*100)/100);
  }
  const wages=wageBill(uc);
  addFin('Salários do elenco',-Math.round(wages*1000)/1000);
  if(mine){const gf=mine.h===uc.id?mine.hg:mine.ag,ga=mine.h===uc.id?mine.ag:mine.hg;if(gf>ga)addFin('Bicho por vitória',-Math.round(wages*0.15*1000)/1000)}
  // ofertas por jogadores à venda
  S.offers=S.offers.filter(o=>o.until>S.round);
  for(const p of uc.players.filter(p=>p.listed)){
    if(rnd()<0.35){
      const buyers=S.clubs.filter(c=>c.id!==uc.id&&c.players.length<32);
      if(buyers.length){const b=pick(buyers);const amt=Math.round(p.value*(0.75+rnd()*0.5)*10)/10;
        S.offers.push({id:'o'+S.season+'_'+S.round+'_'+p.id,pid:p.id,from:b.id,amount:amt,until:S.round+3});
        addNews(`💼 ${b.name} ofereceu ${money(amt)} por ${p.name}.`);}
    }
  }
  S.round++;processLoans();atualizarConfianca(mine);
  if(S.balance<0)addNews('⚠️ Caixa negativo! Venda jogadores para equilibrar as contas.');
  return {jogos:games,meu:mine};
}
