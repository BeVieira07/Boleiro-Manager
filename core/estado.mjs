import { SQUAD_SHAPE, fakePlayer, rate, refStrength, refreshEconomics } from './dados.mjs';
import { migrarDiretoria } from './diretoria.mjs';
import { autoXI } from './motor.mjs';
import { atribuirPosicoes, converterPosicoesAntigas } from './posicoes.mjs';
import { hashStr, money, mulberry32, novaSemente, shuffle } from './utils.mjs';

/* ================= estado ================= */
export let S=null;        // jogo salvo
export let P={};          // índice jogador por id
export const userClub=()=>S.clubs.find(c=>c.id===S.userClubId);
export const clubById=id=>S.clubs.find(c=>c.id===id);
export function usarEstado(s){S=s} // único jeito de trocar o jogo atual de fora deste módulo
export function reindex(){if(S&&S.seed==null){S.seed=novaSemente();S.rng=S.seed} // saves antigos ganham semente
  P={};for(const c of S.clubs)for(const p of c.players){p.clubId=c.id;P[p.id]=p}}
/* ================= divisões ================= */
export const DIVS={A:'Série A',B:'Série B',C:'Série C',D:'Série D'};
export const divOf=c=>(c&&c.division)||'A';
export const divsOf=clubs=>[...new Set(clubs.map(divOf))].sort();
export const divisions=()=>divsOf(S.clubs);
export const hasTwoDivs=()=>divisions().length>1;
export const tvQuota=div=>({A:1.2,B:0.5,C:0.2,D:0.1})[div];
// premiação de fim de temporada e caixa inicial, por série
export const seasonPrize=(div,pos)=>Math.round(({A:5+(20-pos)*2.1,B:1+(20-pos)*0.5,C:0.3+(20-pos)*0.15,D:0.1+(20-pos)*0.08})[div]*10)/10;
export const startBalance=(div,s)=>Math.round(({A:10+(s-60)*1.5,B:Math.max(2,3+(s-55)*0.5),C:Math.max(1,1.5+(s-50)*0.2),D:Math.max(0.8,1+(s-48)*0.1)})[div]*10)/10;
export const MOVE_N=()=>Math.min(4,...divisions().map(d=>S.clubs.filter(c=>divOf(c)===d).length-1));

// regra: monta a campanha nova a partir dos dados (sem tela nem armazenamento)
export function criarJogo(clubId,data){
  const clubs=JSON.parse(JSON.stringify(data.clubs));
  for(const c of clubs){
    if(data.posv!==2)converterPosicoesAntigas(c.players); // dados antigos (aba Dados) usam as siglas de antes da #23
    if(c.players.length<16){const r=mulberry32(hashStr(c.id));let k=0;for(const [pos,n] of Object.entries(SQUAD_SHAPE))while(c.players.filter(p=>p.pos===pos).length<n)c.players.push(fakePlayer(c.id,k++,c.strength,pos,r))}
    atribuirPosicoes(c.players);
    const ref=refStrength(c,clubs);
    c.players.forEach(p=>{p.ovr=rate(p,ref);refreshEconomics(p);p.goals=0;p.listed=false});
    c.formation='4-4-2';
  }
  const seed=novaSemente();
  S={seed,rng:seed,posv:2,season:data.season||2026,dataSource:data.source,round:0,userClubId:clubId,clubs,
     fixtures:makeAllFixtures(clubs),news:[],offers:[],fin:[],history:[]};
  reindex();
  const uc=userClub();
  S.balance=startBalance(divOf(uc),uc.strength);
  uc.lineup=autoXI(uc);migrarDiretoria(S);
  addNews(`Você assumiu o comando do ${uc.name}! Caixa inicial: ${money(S.balance)}.`);
  return S;
}
export function addNews(t){S.news.unshift({r:S.round,t});S.news=S.news.slice(0,40)}
export function addFin(desc,amount){S.balance=Math.round((S.balance+amount)*1000)/1000;S.fin.unshift({s:S.season,r:S.round,desc,amount});S.fin=S.fin.slice(0,80)}

/* ================= calendário e tabela ================= */
export function makeFixtures(ids){
  const t=shuffle([...ids]);if(t.length%2)t.push(null);
  const n=t.length,rounds=[];
  for(let r=0;r<n-1;r++){
    const games=[];
    for(let i=0;i<n/2;i++){
      let h=t[i],a=t[n-1-i];
      if((i===0&&r%2===1)||(i>0&&(r+i)%2===1))[h,a]=[a,h];
      if(h&&a)games.push({h,a});
    }
    rounds.push(games);t.splice(1,0,t.pop());
  }
  return [...rounds,...rounds.map(g=>g.map(x=>({h:x.a,a:x.h})))];
}
// calendário de todas as divisões: a rodada r junta os jogos da rodada r de cada série
export function makeAllFixtures(clubs){
  const per=divsOf(clubs).map(d=>makeFixtures(clubs.filter(c=>divOf(c)===d).map(c=>c.id)));
  const n=Math.max(...per.map(f=>f.length));
  return Array.from({length:n},(_,r)=>per.flatMap(f=>f[r]||[]));
}
export function table(div){
  div=div||divOf(userClub());
  const T={};for(const c of S.clubs)if(divOf(c)===div)T[c.id]={id:c.id,J:0,V:0,E:0,D:0,GP:0,GC:0,Pts:0};
  for(let r=0;r<S.round;r++)for(const g of S.fixtures[r]){
    if(g.hg==null||!T[g.h])continue;const h=T[g.h],a=T[g.a];
    h.J++;a.J++;h.GP+=g.hg;h.GC+=g.ag;a.GP+=g.ag;a.GC+=g.hg;
    if(g.hg>g.ag){h.V++;a.D++;h.Pts+=3}else if(g.hg<g.ag){a.V++;h.D++;a.Pts+=3}else{h.E++;a.E++;h.Pts++;a.Pts++}
  }
  return Object.values(T).sort((x,y)=>y.Pts-x.Pts||y.V-x.V||(y.GP-y.GC)-(x.GP-x.GC)||y.GP-x.GP||clubById(x.id).name.localeCompare(clubById(y.id).name));
}

export function topScorers(n=20,div){return Object.values(P).filter(p=>p.goals>0&&(!div||divOf(clubById(p.clubId))===div)).sort((a,b)=>b.goals-a.goals||b.ovr-a.ovr).slice(0,n)}
