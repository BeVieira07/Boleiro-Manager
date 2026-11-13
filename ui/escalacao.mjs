import { definirFormacao, slotLayout, trocarNaEscalacao, unavailable } from '../core/escalacao.mjs';
import { P, table, userClub } from '../core/estado.mjs';
import { power } from '../core/motor.mjs';
import { ovrNaPosicao, penalidadePosicao, posDSigla } from '../core/posicoes.mjs';
import { FORMS, PORD, esc } from '../core/utils.mjs';
import { save, ui } from './estado.mjs';
import { autoLineup, render } from './telas.mjs';

export function setFormation(f){definirFormacao(f);save();render()}
export function clickEsc(pid){
  const uc=userClub();
  if(ui.selEsc==null||ui.selEsc===pid){ui.selEsc=ui.selEsc===pid?null:pid;render();return}
  const a=ui.selEsc,b=pid;ui.selEsc=null;
  const L=slotLayout(uc).map(s=>s.id).filter(Boolean);
  if(!L.includes(a)&&!L.includes(b)){ui.selEsc=b;render();return}
  const r=trocarNaEscalacao(a,b);if(r.erro){alert(r.erro);render();return}
  save();render();
}
export function vEscalacao(){
  const uc=userClub(),lay=slotLayout(uc),xi=lay.map(s=>s.id).filter(Boolean),pw=power(uc);
  const bench=uc.players.filter(p=>!xi.includes(p.id)).sort((a,b)=>!!unavailable(a)-!!unavailable(b)||PORD[a.pos]-PORD[b.pos]||b.ovr-a.ovr);
  const avisos=[];
  for(const s of lay){
    if(!s.id){avisos.push('Há vaga sem jogador: escale 11 titulares.');break}
    const p=P[s.id],u=unavailable(p);
    if(u)avisos.push(`${p.name} está ${u} e não pode jogar: troque por um reserva.`);
    else{const pp=penalidadePosicao(p,s.d);if(pp.aviso)avisos.push(pp.aviso)}
  }
  const chip=(p,d)=>{
    if(!p)return `<div class="ec vazio">vaga</div>`;
    const u=unavailable(p),fora=d&&penalidadePosicao(p,d).tipo==='fora';
    return `<div class="ec ${ui.selEsc===p.id?'sel':''} ${u?'indisp':fora?'fora':''}" data-acao="clickEsc|${p.id}" title="${esc(p.name)}${u?' — '+u:fora?' — fora de posição':''}">
      <span class="pos ${p.pos}">${posDSigla(p)}</span><b>${d?ovrNaPosicao(p,d):p.ovr}</b><span class="en">${esc(p.name.split(' ').slice(-1)[0])}</span>${u?'<i>🩹</i>':fora?'<i>⚠️</i>':''}</div>`;
  };
  const sz=FORMS[uc.formation]||FORMS['4-4-2'];
  const rows=[['A',sz[2],1+sz[0]+sz[1]],['M',sz[1],1+sz[0]],['D',sz[0],1],['G',1,0]]
    .map(([g,n,off])=>`<div class="linha">${Array.from({length:n},(_,k)=>chip(lay[off+k].id&&P[lay[off+k].id],lay[off+k].d)).join('')}</div>`).join('');
  return `<h2>Escalação — ${esc(uc.name)}</h2>
  <div class="card row">
    <label>Formação <select data-mudar="setFormation">${Object.keys(FORMS).map(f=>`<option ${uc.formation===f?'selected':''}>${f}</option>`).join('')}</select></label>
    <button class="btn sec" data-acao="escalarMelhoresTela">Escalar melhores</button>
    <span class="pill">Titulares: <b class="${xi.length===11?'ok':'bad'}">${xi.length}/11</b></span>
    <span class="pill">Ataque <b>${pw.att.toFixed(0)}</b> · Meio <b>${pw.mid.toFixed(0)}</b> · Defesa <b>${pw.def.toFixed(0)}</b></span>
  </div>
  ${avisos.length?`<div class="card aviso">${avisos.map(a=>`<div>⚠️ ${esc(a)}</div>`).join('')}</div>`:''}
  <p class="muted">Clique em um jogador e depois em outro para trocar (titular com titular, ou titular com reserva). Lesionados e suspensos não podem entrar.</p>
  <div class="cols">
    <div class="campo">${rows}</div>
    <div class="card tw"><h3>Reservas (${bench.length})</h3><table>${bench.map(p=>{const u=unavailable(p);return `<tr class="${ui.selEsc===p.id?'me':''}" style="cursor:pointer;${u?'opacity:.55':''}" data-acao="clickEsc|${p.id}"><td><span class="pos ${p.pos}">${posDSigla(p)}</span></td><td>${esc(p.name)}</td><td class="n ovr">${p.ovr}</td><td class="${u?'bad':'muted'}">${u?'🩹 '+u:''}</td></tr>`}).join('')}</table></div>
  </div>`;
}

export function escalarMelhoresTela(){ui.selEsc=null;autoLineup()}
