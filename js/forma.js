/* ================= forma e evolução do overall (#13) =================
   p.forma acumula o desempenho nas rodadas; ao passar de ±2 o overall sobe ou desce 1 ponto
   (no máximo ±3 por temporada). p.o0 é o overall do início da temporada, para mostrar a tendência.
   A idade age na virada de temporada (newSeason). Saves antigos não têm forma/o0: assumem 0 e o overall atual. */
const FORMA_LIM=2,FORMA_MAX_TEMP=3;
function atualizarForma(games){
  const gols={};
  for(const g of games)for(const e of g.ev)if(e.t==='gol')gols[e.pid]=(gols[e.pid]||0)+1;
  for(const g of games)for(const [id,meu,dele] of [[g.h,g.hg,g.ag],[g.a,g.ag,g.hg]]){
    const c=clubById(id),xi=getXI(c),res=Math.sign(meu-dele);
    for(const p of c.players){
      if(p.o0==null)p.o0=p.ovr;
      let f=(p.forma||0)*0.93;
      if(xi.includes(p.id))f+=0.04+0.3*res+0.5*(gols[p.id]||0);
      else if(!unavailable(p))f-=0.13;
      const d=p.ovr-p.o0;
      if(f>=FORMA_LIM&&p.ovr<95){if(d<FORMA_MAX_TEMP){p.ovr++;refreshEconomics(p);if(c.id===S.userClubId)addNews(`📈 ${p.name} está em grande fase e subiu para ${p.ovr}.`)}f=FORMA_LIM-0.1}
      else if(f<=-FORMA_LIM&&p.ovr>40){if(d>-FORMA_MAX_TEMP){p.ovr--;refreshEconomics(p);if(c.id===S.userClubId)addNews(`📉 ${p.name} está em má fase e caiu para ${p.ovr}.`)}f=-FORMA_LIM+0.1}
      p.forma=Math.round(f*100)/100;
    }
  }
}
// seta de tendência para o elenco: variação desde o início da temporada
function tendenciaTag(p){const d=p.ovr-(p.o0??p.ovr);return d>0?`<span class="ok">▲ +${d}</span>`:d<0?`<span class="bad">▼ ${d}</span>`:'<span class="muted">—</span>'}
