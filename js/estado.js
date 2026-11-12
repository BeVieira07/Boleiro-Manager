/* ================= estado ================= */
let S=null;        // jogo salvo
let P={};          // índice jogador por id
let view='clube';
let lastRound=null; // resultados da última rodada
const userClub=()=>S.clubs.find(c=>c.id===S.userClubId);
const clubById=id=>S.clubs.find(c=>c.id===id);
function reindex(){P={};for(const c of S.clubs)for(const p of c.players){p.clubId=c.id;P[p.id]=p}}
function save(){if(S)store.set(SAVE_KEY,S)}
function getData(){return store.get(DATA_KEY)||(typeof DADOS_PADRAO!=='undefined'?DADOS_PADRAO:sampleData())}

/* ================= divisões ================= */
const DIVS={A:'Série A',B:'Série B',C:'Série C',D:'Série D'};
const divOf=c=>(c&&c.division)||'A';
const divsOf=clubs=>[...new Set(clubs.map(divOf))].sort();
const divisions=()=>divsOf(S.clubs);
const hasTwoDivs=()=>divisions().length>1;
const tvQuota=div=>({A:1.2,B:0.5,C:0.2,D:0.1})[div];
// premiação de fim de temporada e caixa inicial, por série
const seasonPrize=(div,pos)=>Math.round(({A:5+(20-pos)*2.1,B:1+(20-pos)*0.5,C:0.3+(20-pos)*0.15,D:0.1+(20-pos)*0.08})[div]*10)/10;
const startBalance=(div,s)=>Math.round(({A:10+(s-60)*1.5,B:Math.max(2,3+(s-55)*0.5),C:Math.max(1,1.5+(s-50)*0.2),D:Math.max(0.8,1+(s-48)*0.1)})[div]*10)/10;
const MOVE_N=()=>Math.min(4,...divisions().map(d=>S.clubs.filter(c=>divOf(c)===d).length-1));

function newGame(clubId){
  const data=getData();
  const clubs=JSON.parse(JSON.stringify(data.clubs));
  for(const c of clubs){
    if(c.players.length<16){const r=mulberry32(hashStr(c.id));let k=0;for(const [pos,n] of Object.entries(SQUAD_SHAPE))while(c.players.filter(p=>p.pos===pos).length<n)c.players.push(fakePlayer(c.id,k++,c.strength,pos,r))}
    const ref=refStrength(c,clubs);
    c.players.forEach(p=>{p.ovr=rate(p,ref);refreshEconomics(p);p.goals=0;p.listed=false});
    c.formation='4-4-2';
  }
  S={season:data.season||2026,dataSource:data.source,round:0,userClubId:clubId,clubs,
     fixtures:makeAllFixtures(clubs),news:[],offers:[],fin:[],history:[]};
  reindex();
  const uc=userClub();
  S.balance=startBalance(divOf(uc),uc.strength);
  uc.lineup=autoXI(uc);
  addNews(`Você assumiu o comando do ${uc.name}! Caixa inicial: ${money(S.balance)}.`);
  save(); view='clube'; render();
}
function addNews(t){S.news.unshift({r:S.round,t});S.news=S.news.slice(0,40)}
function addFin(desc,amount){S.balance=Math.round((S.balance+amount)*1000)/1000;S.fin.unshift({s:S.season,r:S.round,desc,amount});S.fin=S.fin.slice(0,80)}

/* ================= calendário e tabela ================= */
function makeFixtures(ids){
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
function makeAllFixtures(clubs){
  const per=divsOf(clubs).map(d=>makeFixtures(clubs.filter(c=>divOf(c)===d).map(c=>c.id)));
  const n=Math.max(...per.map(f=>f.length));
  return Array.from({length:n},(_,r)=>per.flatMap(f=>f[r]||[]));
}
function table(div){
  div=div||divOf(userClub());
  const T={};for(const c of S.clubs)if(divOf(c)===div)T[c.id]={id:c.id,J:0,V:0,E:0,D:0,GP:0,GC:0,Pts:0};
  for(let r=0;r<S.round;r++)for(const g of S.fixtures[r]){
    if(g.hg==null||!T[g.h])continue;const h=T[g.h],a=T[g.a];
    h.J++;a.J++;h.GP+=g.hg;h.GC+=g.ag;a.GP+=g.ag;a.GC+=g.hg;
    if(g.hg>g.ag){h.V++;a.D++;h.Pts+=3}else if(g.hg<g.ag){a.V++;h.D++;a.Pts+=3}else{h.E++;a.E++;h.Pts++;a.Pts++}
  }
  return Object.values(T).sort((x,y)=>y.Pts-x.Pts||y.V-x.V||(y.GP-y.GC)-(x.GP-x.GC)||y.GP-x.GP||clubById(x.id).name.localeCompare(clubById(y.id).name));
}

