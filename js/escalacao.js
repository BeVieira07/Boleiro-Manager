/* ================= escalação: tela, disponibilidade e trocas ================= */
// Disponibilidade: p.inj = rodadas de lesão restantes, p.susp = rodadas de suspensão restantes (ausentes em saves antigos = disponível)
function unavailable(p){
  if(p.inj>0)return `lesionado (${p.inj} rod.)`;
  if(p.susp>0)return `suspenso (${p.susp} rod.)`;
  return null;
}
// depois de cada rodada: cumpre as ausências e sorteia novas lesões e suspensões entre os titulares
function aplicarDisponibilidade(games){
  for(const c of S.clubs)for(const p of c.players){if(p.inj>0)p.inj--;if(p.susp>0)p.susp--}
  for(const g of games)for(const id of [g.h,g.a]){
    const c=clubById(id);
    for(const pid of getXI(c)){
      const p=P[pid];if(!p)continue;
      let msg=null;
      if(rnd()<0.012){p.inj=ri(1,5);msg=`🩹 ${p.name} se lesionou e desfalca o time por ${p.inj} rodada(s).`}
      else if(rnd()<0.015){p.susp=1;msg=`🟥 ${p.name} foi expulso e cumpre 1 jogo de suspensão.`}
      if(msg&&c.id===S.userClubId)addNews(msg);
    }
  }
}
// grupos de cada vaga, em ordem: goleiro, defesa, meio, ataque
function slotGroups(f){const s=FORMS[f]||FORMS['4-4-2'];return ['G',...Array(s[0]).fill('D'),...Array(s[1]).fill('M'),...Array(s[2]).fill('A')]}
// reposiciona os ids nas vagas da formação: cada um na vaga da sua posição, o resto completa as vagas livres
function reslot(ids,f){
  const groups=slotGroups(f),left=[...ids],out=groups.map(()=>null);
  groups.forEach((g,i)=>{const k=left.findIndex(id=>P[id]&&P[id].pos===g);if(k>=0)out[i]=left.splice(k,1)[0]});
  out.forEach((v,i)=>{if(v==null&&left.length)out[i]=left.shift()});
  return out.filter(v=>v!=null);
}
function setFormation(f){const uc=userClub();uc.formation=f;uc.lineup=reslot(getXI(uc),f);save();render()}
// vaga i da formação = lineup[i] (com 11 titulares); com menos que isso, reposiciona automaticamente
function slotLayout(uc){
  const xi=getXI(uc);
  const ids=xi.length===11?xi:reslot(xi,uc.formation);
  return slotGroups(uc.formation).map((g,i)=>({g,id:ids[i]||null}));
}
let selEsc=null;
function clickEsc(pid){
  const uc=userClub();
  if(selEsc==null||selEsc===pid){selEsc=selEsc===pid?null:pid;render();return}
  const a=selEsc,b=pid;selEsc=null;
  const L=slotLayout(uc).map(s=>s.id).filter(Boolean),ia=L.indexOf(a),ib=L.indexOf(b);
  if(ia<0&&ib<0){selEsc=b;render();return}
  if(ia>=0&&ib>=0){[L[ia],L[ib]]=[L[ib],L[ia]]}
  else{ // titular x reserva
    const out=ia>=0?a:b,inn=ia>=0?b:a,r=unavailable(P[inn]);
    if(r){alert(`${P[inn].name} está ${r} e não pode ser escalado.`);render();return}
    L[L.indexOf(out)]=inn;
  }
  uc.lineup=L;save();render();
}
function vEscalacao(){
  const uc=userClub(),lay=slotLayout(uc),xi=lay.map(s=>s.id).filter(Boolean),pw=power(uc);
  const bench=uc.players.filter(p=>!xi.includes(p.id)).sort((a,b)=>!!unavailable(a)-!!unavailable(b)||PORD[a.pos]-PORD[b.pos]||b.ovr-a.ovr);
  const avisos=[];
  for(const s of lay){
    if(!s.id){avisos.push('Há vaga sem jogador: escale 11 titulares.');break}
    const p=P[s.id],u=unavailable(p);
    if(u)avisos.push(`${p.name} está ${u} e não pode jogar: troque por um reserva.`);
    else if(p.pos!==s.g)avisos.push(`${p.name} (${POSL[p.pos]}) está fora de posição (vaga de ${POSL[s.g]}).`);
  }
  const chip=(p,g)=>{
    if(!p)return `<div class="ec vazio">vaga</div>`;
    const u=unavailable(p),fora=g&&p.pos!==g;
    return `<div class="ec ${selEsc===p.id?'sel':''} ${u?'indisp':fora?'fora':''}" onclick="clickEsc('${p.id}')" title="${esc(p.name)}${u?' — '+u:fora?' — fora de posição':''}">
      <span class="pos ${p.pos}">${POSL[p.pos]}</span><b>${p.ovr}</b><span class="en">${esc(p.name.split(' ').slice(-1)[0])}</span>${u?'<i>🩹</i>':fora?'<i>⚠️</i>':''}</div>`;
  };
  const sz=FORMS[uc.formation]||FORMS['4-4-2'];
  const rows=[['A',sz[2],1+sz[0]+sz[1]],['M',sz[1],1+sz[0]],['D',sz[0],1],['G',1,0]]
    .map(([g,n,off])=>`<div class="linha">${Array.from({length:n},(_,k)=>chip(lay[off+k].id&&P[lay[off+k].id],g)).join('')}</div>`).join('');
  return `<h2>Escalação — ${esc(uc.name)}</h2>
  <div class="card row">
    <label>Formação <select onchange="setFormation(this.value)">${Object.keys(FORMS).map(f=>`<option ${uc.formation===f?'selected':''}>${f}</option>`).join('')}</select></label>
    <button class="btn sec" onclick="selEsc=null;autoLineup()">Escalar melhores</button>
    <span class="pill">Titulares: <b class="${xi.length===11?'ok':'bad'}">${xi.length}/11</b></span>
    <span class="pill">Ataque <b>${pw.att.toFixed(0)}</b> · Meio <b>${pw.mid.toFixed(0)}</b> · Defesa <b>${pw.def.toFixed(0)}</b></span>
  </div>
  ${avisos.length?`<div class="card aviso">${avisos.map(a=>`<div>⚠️ ${esc(a)}</div>`).join('')}</div>`:''}
  <p class="muted">Clique em um jogador e depois em outro para trocar (titular com titular, ou titular com reserva). Lesionados e suspensos não podem entrar.</p>
  <div class="cols">
    <div class="campo">${rows}</div>
    <div class="card tw"><h3>Reservas (${bench.length})</h3><table>${bench.map(p=>{const u=unavailable(p);return `<tr class="${selEsc===p.id?'me':''}" style="cursor:pointer;${u?'opacity:.55':''}" onclick="clickEsc('${p.id}')"><td><span class="pos ${p.pos}">${POSL[p.pos]}</span></td><td>${esc(p.name)}</td><td class="n ovr">${p.ovr}</td><td class="${u?'bad':'muted'}">${u?'🩹 '+u:''}</td></tr>`}).join('')}</table></div>
  </div>`;
}
