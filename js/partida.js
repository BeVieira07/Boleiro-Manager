/* ================= jogo ao vivo ================= */
function crest(c,cls=''){
  const sigla=`<span class="crest ${cls}" style="background:${c.color||'#335'};color:#fff">${esc(c.short||c.name.slice(0,3))}</span>`;
  // se a imagem não carregar, troca pela sigla colorida em vez de deixar o círculo vazio
  if(c.logo)return `<img class="crest ${cls}" src="${esc(c.logo)}" alt="" data-f="${esc(sigla)}" onerror="this.outerHTML=this.dataset.f">`;
  return sigla;
}
function showLive(g,done){
  const H=clubById(g.h),A=clubById(g.a);let min=0,hs=0,as=0,timer=null;
  openModal(`<div class="score"><div>${crest(H)}<br>${esc(H.name)}</div><div class="num" id="lsc">0 x 0</div><div>${crest(A)}<br>${esc(A.name)}</div></div>
    <div class="clock" id="lclk">0'</div><div class="bar"><div id="lbar" style="width:0"></div></div>
    <ul class="feed" id="lfeed"><li class="muted">Bola rolando!</li></ul>
    <div class="row" id="ltat">${controlesTatica('tvLive')}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn sec" id="lskip">Pular para o fim</button><button class="btn" id="ldone" style="display:none">Continuar</button></div>`);
  const feed=document.getElementById('lfeed');
  const tick=()=>{
    min++;
    for(const e of g.ev.filter(e=>e.m===min)){
      const team=e.side==='h'?H:A;
      if(e.t==='gol'){e.side==='h'?hs++:as++;feed.insertAdjacentHTML('afterbegin',`<li>⚽ <b>${e.m}'</b> GOL do ${esc(team.name)}! ${esc(e.name)}</li>`)}
      else feed.insertAdjacentHTML('afterbegin',`<li class="muted">🟨 ${e.m}' ${esc(e.name)} (${esc(team.short)})</li>`);
    }
    document.getElementById('lsc').textContent=`${hs} x ${as}`;
    document.getElementById('lclk').textContent=min+"'";
    document.getElementById('lbar').style.width=Math.min(100,min/93*100)+'%';
    if(min>=93)finish();
  };
  tvAoVivo={g,min:()=>min};
  const finish=()=>{clearInterval(timer);while(min<93)tick();tvAoVivo=null;document.getElementById('ltat').style.display='none';
    document.getElementById('lclk').textContent='Fim de jogo';
    document.getElementById('lskip').style.display='none';document.getElementById('ldone').style.display='';};
  timer=setInterval(tick,55);
  document.getElementById('lskip').onclick=()=>{clearInterval(timer);if(min<93){while(min<92)tick();tick()}};
  document.getElementById('ldone').onclick=()=>{closeModal();done()};
}
function openModal(html){document.getElementById('mbox').innerHTML=html;document.getElementById('modal').style.display='flex'}
function closeModal(){document.getElementById('modal').style.display='none'}

/* ================= fim de temporada ================= */
function seasonEnd(){
  if(S.seasonClosed===S.season)return;
  const uc=userClub(),div=divOf(uc),T=table(div),pos=T.findIndex(t=>t.id===uc.id)+1,two=hasTwoDivs(),mv=MOVE_N();
  const prize=seasonPrize(div,pos),ds=divisions(),di=ds.indexOf(div);
  addFin(`Premiação ${DIVS[div]} — ${pos}º lugar`,prize);
  const champs=divisions().map(d=>({d,c:clubById(table(d)[0].id)}));
  const top=topScorers(1,divisions()[0])[0];
  S.history.unshift({season:S.season,champ:champs[0].c.name,champs:Object.fromEntries(champs.map(x=>[x.d,x.c.name])),me:pos,div,scorer:top?`${top.name} (${top.goals})`:'-'});
  S.seasonClosed=S.season;save();
  const fate=!two?(pos>=17?'<p class="bad">Seu time terminou na zona de rebaixamento… a diretoria está de olho!</p>':'')
    :di<ds.length-1&&pos>T.length-mv?`<p class="bad">⬇️ Seu time foi rebaixado para a ${DIVS[ds[di+1]]}.</p>`
    :di>0&&pos<=mv?`<p class="ok">⬆️ Acesso! Seu time vai disputar a ${DIVS[ds[di-1]]}.</p>`:'';
  openModal(`<h2>🏆 Fim da temporada ${S.season}</h2>
   ${champs.map(x=>`<p>Campeão${two?' da '+DIVS[x.d]:''}: <b class="gold">${esc(x.c.name)}</b></p>`).join('')}
   <p>Seu time terminou em <b>${pos}º lugar</b>${two?' na '+DIVS[div]:''} e recebeu ${money(prize)} de premiação.</p>
   <p>Artilheiro${two?' da '+DIVS[divisions()[0]]:''}: ${top?esc(top.name)+' — '+top.goals+' gols':'-'}</p>
   ${fate}
   <div class="row" style="justify-content:flex-end"><button class="btn sec" onclick="closeModal()">Ver tabela</button><button class="btn" onclick="closeModal();newSeason()">Iniciar temporada ${S.season+1}</button></div>`);
}
function newSeason(){
  const r=rnd;
  if(hasTwoDivs()){ // acesso e rebaixamento entre séries vizinhas, com base nas tabelas finais
    const ds=divisions(),n=MOVE_N(),moves=[];
    for(let i=0;i<ds.length-1;i++)moves.push({hi:ds[i],lo:ds[i+1],down:table(ds[i]).slice(-n).map(t=>clubById(t.id)),up:table(ds[i+1]).slice(0,n).map(t=>clubById(t.id))});
    for(const m of moves){ // aplica só depois de calcular todas as tabelas
      m.down.forEach(c=>c.division=m.lo);m.up.forEach(c=>c.division=m.hi);
      addNews(`⬆️ Sobem para a ${DIVS[m.hi]}: ${m.up.map(c=>c.name).join(', ')}.`);
      addNews(`⬇️ Caem para a ${DIVS[m.lo]}: ${m.down.map(c=>c.name).join(', ')}.`);
    }
  }
  for(const c of S.clubs){
    const keep=[];
    for(const p of c.players){
      p.age++;
      const d=p.age<=21?ri(1,4):p.age<=24?ri(0,3):p.age<=29?ri(-1,1):p.age<=32?ri(-2,0):ri(-4,-1);
      p.ovr=clamp(p.ovr+d,40,95);p.goals=0;
      if(p.age>=37){if(c.id===S.userClubId)addNews(`👋 ${p.name} se aposentou.`);continue}
      refreshEconomics(p);keep.push(p);
    }
    c.players=keep;ensureSquad(c);
  }
  S.season++;S.round=0;S.fixtures=makeAllFixtures(S.clubs);S.offers=[];
  reindex();
  const uc=userClub();uc.lineup=getXI(uc);if(uc.lineup.length<11)uc.lineup=autoXI(uc);
  addNews(`📅 Começa a temporada ${S.season}!`);save();view='clube';render();
}
function ensureSquad(c){
  const r=rnd;let i=c.players.length+100;
  for(const [pos,n] of Object.entries({G:2,D:5,M:5,A:3})){
    while(c.players.filter(p=>p.pos===pos).length<n){
      const p=fakePlayer(c.id,i++,c.strength,pos,r,[17,19]);p.ovr=clamp(c.strength-10+ri(-4,6),40,85);
      p.goals=0;p.listed=false;refreshEconomics(p);p.clubId=c.id;c.players.push(p);P[p.id]=p;
      if(c.id===S.userClubId)addNews(`🌱 ${p.name} (${POSL[pos]}) subiu da base.`);
    }
  }
}

