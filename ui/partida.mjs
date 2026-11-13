import { DIVS, S, clubById, divisions } from '../core/estado.mjs';
import { fecharTemporada, iniciarTemporada } from '../core/partida.mjs';
import { esc, money } from '../core/utils.mjs';
import { save, ui } from './estado.mjs';
import { controlesTatica, tvLive } from './taticas.mjs';
import { render } from './telas.mjs';

/* ================= jogo ao vivo ================= */
export function crest(c,cls=''){
  const sigla=`<span class="crest ${cls}" style="background:${c.color||'#335'};color:#fff">${esc(c.short||c.name.slice(0,3))}</span>`;
  // se a imagem não carregar, troca pela sigla colorida em vez de deixar o círculo vazio
  if(c.logo)return `<img class="crest ${cls}" src="${esc(c.logo)}" alt="" data-f="${esc(sigla)}" onerror="this.outerHTML=this.dataset.f">`;
  return sigla;
}
export function showLive(g,done){
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
  ui.tvAoVivo={g,min:()=>min};
  const finish=()=>{clearInterval(timer);while(min<93)tick();ui.tvAoVivo=null;document.getElementById('ltat').style.display='none';
    document.getElementById('lclk').textContent='Fim de jogo';
    document.getElementById('lskip').style.display='none';document.getElementById('ldone').style.display='';};
  timer=setInterval(tick,55);
  document.getElementById('lskip').onclick=()=>{clearInterval(timer);if(min<93){while(min<92)tick();tick()}};
  document.getElementById('ldone').onclick=()=>{closeModal();done()};
}
export function openModal(html){document.getElementById('mbox').innerHTML=html;document.getElementById('modal').style.display='flex'}
export function closeModal(){document.getElementById('modal').style.display='none'}

export function seasonEnd(){
  const r=fecharTemporada();if(!r)return;save();
  const {div,T,pos,two,mv,prize,ds,di,champs,top}=r;
  const fate=!two?(pos>=17?'<p class="bad">Seu time terminou na zona de rebaixamento… a diretoria está de olho!</p>':'')
    :di<ds.length-1&&pos>T.length-mv?`<p class="bad">⬇️ Seu time foi rebaixado para a ${DIVS[ds[di+1]]}.</p>`
    :di>0&&pos<=mv?`<p class="ok">⬆️ Acesso! Seu time vai disputar a ${DIVS[ds[di-1]]}.</p>`:'';
  openModal(`<h2>🏆 Fim da temporada ${S.season}</h2>
   ${champs.map(x=>`<p>Campeão${two?' da '+DIVS[x.d]:''}: <b class="gold">${esc(x.c.name)}</b></p>`).join('')}
   <p>Seu time terminou em <b>${pos}º lugar</b>${two?' na '+DIVS[div]:''} e recebeu ${money(prize)} de premiação.</p>
   <p>Artilheiro${two?' da '+DIVS[divisions()[0]]:''}: ${top?esc(top.name)+' — '+top.goals+' gols':'-'}</p>
   ${fate}
   <div class="row" style="justify-content:flex-end"><button class="btn sec" data-acao="closeModal">Ver tabela</button><button class="btn" data-acao="fecharEIniciarTemporada">Iniciar temporada ${S.season+1}</button></div>`);
}
export function newSeason(){iniciarTemporada();save();ui.view='clube';render()}
export function fecharEIniciarTemporada(){closeModal();newSeason()}
