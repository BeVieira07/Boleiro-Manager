import { loanOf, wageBill } from '../core/emprestimos.mjs';
import { escalarMelhores } from '../core/escalacao.mjs';
import { DIVS, MOVE_N, P, S, clubById, divOf, divisions, divsOf, hasTwoDivs, table, topScorers, tvQuota, userClub } from '../core/estado.mjs';
import { getXI } from '../core/motor.mjs';
import { POSD, POSD_ORDEM, posDSigla } from '../core/posicoes.mjs';
import { clamp, esc, money, norm } from '../core/utils.mjs';
import { API, exportData, exportSave, importFromApi, loadDataFile, loadSaveFile, resetData, resetGame } from './api.mjs';
import { painelDiretoria } from './diretoria.mjs';
import { loanBtn, loanTag, vLoans } from './emprestimos.mjs';
import { vEscalacao } from './escalacao.mjs';
import { getData, newGame, save, ui } from './estado.mjs';
import { tendenciaTag } from './forma.mjs';
import { acceptOffer, makeBid, quickSell, rejectOffer, toggleListed } from './mercado.mjs';
import { playRound, simToEnd } from './motor.mjs';
import { crest, newSeason, seasonEnd } from './partida.mjs';
import { posTag } from './posicoes.mjs';
import { vMenu, voltarMenu } from './saves.mjs';
import { painelTatica } from './taticas.mjs';
import { APIKEY_KEY, DATA_KEY, store } from './utils.mjs';

/* ================= telas ================= */
export const NAV=[['clube','Clube'],['elenco','Elenco'],['escalacao','Escalação'],['tabela','Tabela'],['jogos','Jogos'],['artilharia','Artilharia'],['mercado','Mercado'],['financas','Finanças'],['dados','Dados']];
export function go(v){ui.view=v;render();window.scrollTo(0,0)}
export const curDiv=()=>ui.vDiv&&divisions().includes(ui.vDiv)?ui.vDiv:divOf(userClub());
export const inDiv=(g,d)=>divOf(clubById(g.h))===d;
export function divTabs(){
  if(!hasTwoDivs())return '';
  return `<div class="row">${divisions().map(d=>`<button class="btn sm ${curDiv()===d?'':'sec'}" data-acao="verDivisao|${d}">${DIVS[d]}</button>`).join('')}</div>`;
}
export function render(){
  const nav=document.getElementById('nav'),hi=document.getElementById('hinfo');
  if(!S){nav.innerHTML=ui.view==='menu'?'':`<button data-acao="go|menu">☰ Menu</button>`;hi.innerHTML='';if(ui.view!=='dados'&&ui.view!=='inicio')ui.view='menu';}
  else{
    const uc=userClub(),pos=table().findIndex(t=>t.id===uc.id)+1;
    hi.innerHTML=`<span>${crest(uc)} <b>${esc(uc.name)}</b></span>${hasTwoDivs()?`<span><b>${DIVS[divOf(uc)]}</b></span>`:''}<span>Temporada <b>${S.season}</b></span><span>Rodada <b>${Math.min(S.round+1,S.fixtures.length)}/${S.fixtures.length}</b></span><span>Posição <b>${S.round?pos+'º':'-'}</b></span><span>Caixa <b class="${S.balance<0?'bad':'ok'}">${money(S.balance)}</b></span>`;
    nav.innerHTML=NAV.map(([k,l])=>`<button class="${ui.view===k?'on':''}" data-acao="go|${k}">${l}</button>`).join('')+
      (S.round<S.fixtures.length?`<button class="on" style="margin-left:auto" data-acao="playRound">▶ Jogar rodada ${S.round+1}</button>`:'')+
      `<button data-acao="voltarMenu" title="Salvar e voltar à tela inicial"${S.round<S.fixtures.length?'':' style="margin-left:auto"'}>☰ Menu</button>`;
  }
  const V={menu:vMenu,inicio:vInicio,clube:vClube,elenco:vElenco,escalacao:vEscalacao,tabela:vTabela,jogos:vJogos,artilharia:vArt,mercado:vMercado,financas:vFin,dados:vDados,rodada:vRodada};
  document.getElementById('app').innerHTML=(V[ui.view]||vClube)();
}
export function stars(s){const n=clamp(Math.round((s-62)/4),1,5);return '★'.repeat(n)+'☆'.repeat(5-n)}
export function vInicio(){
  const d=getData(),ds=divsOf(d.clubs);
  const card=c=>`<div class="card clubcard" data-acao="newGame|${c.id}">${crest(c)}<div><b>${esc(c.name)}</b></div><div class="stars">${stars(c.strength)}</div><div class="muted">${c.players.length} jogadores</div></div>`;
  return `<h2>Novo jogo</h2>
  <div class="card row"><span>Dados: <b>${d.source==='api'?'API-Football (reais)':'Exemplo (jogadores fictícios)'}</b> — temporada ${d.season}, ${ds.map(x=>`${DIVS[x]} (${d.clubs.filter(c=>divOf(c)===x).length} clubes)`).join(' + ')}.</span>
  <button class="btn sec sm" data-acao="go|dados">${d.source==='api'?'Gerenciar dados':'Importar dados reais'}</button>
  <label class="btn sec sm">Carregar save<input type="file" accept=".json" style="display:none" data-mudar="loadSaveFile"></label></div>
  <h3>Escolha seu clube</h3>
  ${ds.map(x=>`${ds.length>1?`<h3>${DIVS[x]}</h3>`:''}<div class="grid">${d.clubs.filter(c=>divOf(c)===x).sort((a,b)=>b.strength-a.strength).map(card).join('')}</div>`).join('')}`;
}
export function resultLine(g,me){
  const H=clubById(g.h),A=clubById(g.a);
  const cls=me&&(g.h===me||g.a===me)?' class="me"':'';
  return `<tr${cls}><td class="n">${crest(H)} ${esc(H.name)}</td><td style="text-align:center"><b>${g.hg==null?'x':g.hg+' x '+g.ag}</b></td><td>${esc(A.name)} ${crest(A)}</td></tr>`;
}
export function vClube(){
  const uc=userClub(),me=uc.id;
  const next=S.round<S.fixtures.length?S.fixtures[S.round].find(g=>g.h===me||g.a===me):null;
  const T=table(),pos=T.findIndex(t=>t.id===me)+1,row=T.find(t=>t.id===me);
  const offers=S.offers.filter(o=>P[o.pid]&&P[o.pid].clubId===me);
  const last=[];for(let r=S.round-1;r>=0&&last.length<5;r--){const g=S.fixtures[r].find(g=>g.h===me||g.a===me);if(g)last.push(g)}
  return `<h2>${crest(uc)} ${esc(uc.name)}</h2>
  <div class="cols">
   <div class="card"><h3>Próximo jogo</h3>${next?`<div class="score" style="font-size:15px">${crest(clubById(next.h))} ${esc(clubById(next.h).name)} <span class="muted">x</span> ${esc(clubById(next.a).name)} ${crest(clubById(next.a))}</div>
     <p class="muted" style="text-align:center">${next.h===me?'Em casa':'Fora de casa'} · Rodada ${S.round+1}</p>
     <div class="row" style="justify-content:center"><button class="btn big" data-acao="playRound">▶ Jogar rodada</button><button class="btn sec" data-acao="simToEnd">Simular até o fim</button></div>`
     :`<p>Temporada encerrada.</p><button class="btn" data-acao="proximaTemporada">Iniciar temporada ${S.season+1}</button>`}</div>
   <div class="card"><h3>Campanha</h3><p>${S.round?`<b>${pos}º</b> lugar · ${row.Pts} pts · ${row.V}V ${row.E}E ${row.D}D · saldo ${row.GP-row.GC}`:'A temporada ainda não começou.'}</p>
     <h3>Últimos jogos</h3><table>${last.map(g=>resultLine(g)).join('')||'<tr><td class="muted">—</td></tr>'}</table></div>
  </div>
  ${offers.length?`<div class="card"><h3>Propostas recebidas</h3><table>${offers.map(o=>`<tr><td>${esc(P[o.pid].name)}</td><td>${esc(clubById(o.from).name)}</td><td class="n">${money(o.amount)}</td><td class="muted">valor ${money(P[o.pid].value)}</td><td><button class="btn sm" data-acao="acceptOffer|${o.id}">Aceitar</button> <button class="btn sec sm" data-acao="rejectOffer|${o.id}">Recusar</button></td></tr>`).join('')}</table></div>`:''}
  ${painelDiretoria()}
  ${painelTatica()}
  <div class="card"><h3>Notícias</h3><ul class="news">${S.news.slice(0,12).map(n=>`<li>${esc(n.t)}</li>`).join('')}</ul></div>
  ${S.history.length?(()=>{const ch=h=>h.champs||{A:h.champ,...(h.champB?{B:h.champB}:{})};const hd=[...new Set(S.history.flatMap(h=>Object.keys(ch(h))))].sort(),many=hd.length>1;
   return `<div class="card"><h3>Histórico</h3><table><tr><th>Temporada</th>${hd.map(x=>`<th>Campeão${many?' '+DIVS[x]:''}</th>`).join('')}<th>Sua posição</th><th>Artilheiro</th></tr>${S.history.map(h=>`<tr><td>${h.season}</td>${hd.map(x=>`<td>${esc(ch(h)[x]||'-')}</td>`).join('')}<td>${h.me}º${many&&h.div?' ('+DIVS[h.div]+')':''}</td><td>${esc(h.scorer)}</td></tr>`).join('')}</table></div>`})():''}`;
}
export function autoLineup(){escalarMelhores();save();render()}
export function vElenco(){
  const uc=userClub(),xi=getXI(uc),ps=[...uc.players].sort((a,b)=>POSD_ORDEM.indexOf(posDSigla(a))-POSD_ORDEM.indexOf(posDSigla(b))||b.ovr-a.ovr);
  return `<h2>Elenco — ${esc(uc.name)}</h2>
  <p class="muted">Titulares (linha destacada), reservas e formação são definidos na tela de Escalação.</p>
  <div class="card tw"><table><tr><th>Pos</th><th>#</th><th>Nome</th><th class="n">Idade</th><th class="n">Força</th><th class="n">Tend.</th><th class="n">Gols</th><th class="n">Valor</th><th class="n">Salário/rod.</th><th>Mercado</th></tr>
  ${ps.map(p=>`<tr${xi.includes(p.id)?' class="me"':''}><td>${posTag(p)}</td><td class="muted">${p.number??''}</td><td>${esc(p.name)}${loanTag(p)}</td><td class="n">${p.age}</td><td class="n ovr">${p.ovr}</td><td class="n">${tendenciaTag(p)}</td><td class="n">${p.goals||0}</td>
   <td class="n">${money(p.value)}</td><td class="n">${money(p.wage)}</td>
   <td>${loanOf(p.id)?'':`<button class="btn sm ${p.listed?'red':'sec'}" data-acao="toggleListed|${p.id}">${p.listed?'À venda ✓':'Pôr à venda'}</button> <button class="btn sec sm" data-acao="quickSell|${p.id}">Vender já</button> `}${loanBtn(p,'out')}</td></tr>`).join('')}
  </table></div>${vLoans()}`;
}
export function vTabela(){
  const d=curDiv(),T=table(d),me=S.userClubId,two=hasTwoDivs(),mv=two?MOVE_N():4;
  const ds=divisions(),di=ds.indexOf(d),last=di===ds.length-1;
  const top=di===0?6:mv,bottom=!two?4:last?0:mv;
  return `<h2>Classificação — ${two?DIVS[d]+' ':'Brasileirão '}${S.season}</h2>${divTabs()}
  <p class="muted"><span style="color:var(--info)">▌</span> ${di===0?'Libertadores (G6)':`Acesso à ${DIVS[ds[di-1]]} (G${mv})`}${bottom?` &nbsp; <span style="color:var(--danger)">▌</span> Rebaixamento${two?' para a '+DIVS[ds[di+1]]:''} (Z${bottom})`:''}</p>
  <div class="card tw"><table><tr><th>#</th><th>Clube</th><th class="n">Pts</th><th class="n">J</th><th class="n">V</th><th class="n">E</th><th class="n">D</th><th class="n">GP</th><th class="n">GC</th><th class="n">SG</th></tr>
  ${T.map((t,i)=>{const c=clubById(t.id);return `<tr class="${t.id===me?'me':''}"><td class="${i<top?'zone-lib':bottom&&i>=T.length-bottom?'zone-z4':''}">${i+1}</td><td><span class="club">${crest(c)} ${esc(c.name)}</span></td><td class="n"><b>${t.Pts}</b></td><td class="n">${t.J}</td><td class="n">${t.V}</td><td class="n">${t.E}</td><td class="n">${t.D}</td><td class="n">${t.GP}</td><td class="n">${t.GC}</td><td class="n">${t.GP-t.GC}</td></tr>`}).join('')}
  </table></div>`;
}
export function vJogos(){
  const r=ui.jogosRound??Math.min(S.round,S.fixtures.length-1);
  const d=curDiv();
  return `<h2>Jogos${hasTwoDivs()?' — '+DIVS[d]:''}</h2>${divTabs()}<div class="card row"><button class="btn sec sm" data-acao="verRodadaJogos|${Math.max(0,r-1)}">◀</button>
  <b>Rodada ${r+1}</b><button class="btn sec sm" data-acao="verRodadaJogos|${Math.min(S.fixtures.length-1,r+1)}">▶</button></div>
  <div class="card tw"><table>${S.fixtures[r].filter(g=>inDiv(g,d)).map(g=>resultLine(g,S.userClubId)).join('')}</table></div>`;
}
export function vRodada(){
  if(!ui.lastRound)return vClube();
  const me=S.userClubId,d=curDiv();
  return `<h2>Resultados — rodada ${ui.lastRound.round}${hasTwoDivs()?' — '+DIVS[d]:''}</h2>${divTabs()}
  <div class="card tw"><table>${ui.lastRound.games.filter(g=>inDiv(g,d)).map(g=>resultLine(g,me)).join('')}</table></div>
  <div class="row">${S.round<S.fixtures.length?`<button class="btn big" data-acao="playRound">▶ Jogar rodada ${S.round+1}</button>`:''}<button class="btn sec" data-acao="go|tabela">Ver tabela</button><button class="btn sec" data-acao="go|clube">Clube</button></div>`;
}
export function vArt(){
  const d=curDiv(),L=topScorers(25,d);
  return `<h2>Artilharia${hasTwoDivs()?' — '+DIVS[d]:''}</h2>${divTabs()}<div class="card tw"><table><tr><th>#</th><th>Jogador</th><th>Clube</th><th class="n">Gols</th></tr>
  ${L.map((p,i)=>`<tr class="${p.clubId===S.userClubId?'me':''}"><td>${i+1}</td><td>${posTag(p)} ${esc(p.name)}</td><td>${esc(clubById(p.clubId).name)}</td><td class="n"><b>${p.goals}</b></td></tr>`).join('')||'<tr><td class="muted">Nenhum gol ainda.</td></tr>'}</table></div>`;
}
export function setMF(k,v){ui.mf[k]=v;render()}
export function vMercado(){
  const uc=userClub();
  let L=Object.values(P).filter(p=>p.clubId!==uc.id);
  if(ui.mf.pos)L=L.filter(p=>posDSigla(p)===ui.mf.pos);
  if(ui.mf.club)L=L.filter(p=>p.clubId===ui.mf.club);
  if(ui.mf.q)L=L.filter(p=>norm(p.name).includes(norm(ui.mf.q)));
  if(ui.mf.max)L=L.filter(p=>p.value<=parseFloat(ui.mf.max));
  L.sort((a,b)=>b.ovr-a.ovr);const total=L.length;L=L.slice(0,120);
  return `<h2>Mercado de transferências</h2>
  <div class="card row">
   <select data-mudar="setMF|pos"><option value="">Todas as posições</option>${Object.entries(POSD).map(([k,d])=>`<option value="${k}" ${ui.mf.pos===k?'selected':''}>${d.nome}</option>`).join('')}</select>
   <select data-mudar="setMF|club"><option value="">Todos os clubes</option>${S.clubs.filter(c=>c.id!==uc.id).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}" ${ui.mf.club===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
   <input placeholder="Buscar nome" value="${esc(ui.mf.q)}" data-mudar="setMF|q">
   <input placeholder="Valor máx. (mi)" style="width:130px" value="${esc(ui.mf.max)}" data-mudar="setMF|max">
   <span class="pill">Caixa: <b>${money(S.balance)}</b></span><span class="pill">Elenco: ${uc.players.length}/32</span>
  </div>
  <p class="muted">${total} jogadores${total>120?' (mostrando os 120 melhores)':''}. Craques do time vendedor custam mais caro. Uma proposta por jogador a cada rodada.</p>
  <div class="card tw"><table><tr><th>Pos</th><th>Nome</th><th>Clube</th><th class="n">Idade</th><th class="n">Força</th><th class="n">Valor</th><th class="n">Salário/rod.</th><th></th></tr>
  ${L.map(p=>`<tr><td>${posTag(p)}</td><td>${esc(p.name)}${loanTag(p)}</td><td>${esc(clubById(p.clubId).name)}</td><td class="n">${p.age}</td><td class="n ovr">${p.ovr}</td><td class="n">${money(p.value)}</td><td class="n">${money(p.wage)}</td><td>${loanOf(p.id)?'':`<button class="btn sm" data-acao="makeBid|${p.id}">Proposta</button> ${loanBtn(p,'in')}`}</td></tr>`).join('')}
  </table></div>`;
}
export function vFin(){
  const uc=userClub(),w=wageBill(uc);
  const val=uc.players.reduce((s,p)=>s+p.value,0);
  return `<h2>Finanças</h2>
  <div class="grid">
   <div class="card"><div class="muted">Caixa</div><div style="font-size:22px;font-weight:800" class="${S.balance<0?'bad':'ok'}">${money(S.balance)}</div></div>
   <div class="card"><div class="muted">Folha salarial por rodada</div><div style="font-size:22px;font-weight:800">${money(w)}</div></div>
   <div class="card"><div class="muted">Valor do elenco</div><div style="font-size:22px;font-weight:800">${money(val)}</div></div>
   <div class="card"><div class="muted">Receitas</div><div>TV ${money(tvQuota(divOf(uc)))} por rodada + bilheteria em casa + premiação no fim</div></div>
  </div>
  <div class="card tw"><h3>Movimentações</h3><table><tr><th>Temp.</th><th>Rod.</th><th>Descrição</th><th class="n">Valor</th></tr>
  ${S.fin.map(f=>`<tr><td>${f.s}</td><td>${f.r+1}</td><td>${esc(f.desc)}</td><td class="n ${f.amount<0?'bad':'ok'}">${money(f.amount)}</td></tr>`).join('')||'<tr><td class="muted">Sem movimentações.</td></tr>'}</table></div>`;
}
export function vDados(){
  const d=getData(),k=store.get(APIKEY_KEY)||'';
  return `<h2>Dados do jogo</h2>
  <div class="card"><p>Fonte atual: <b>${d.source==='api'?'API-Football':'Exemplo (fictício)'}</b> · temporada ${d.season} · ${divsOf(d.clubs).map(x=>`${DIVS[x]}: ${d.clubs.filter(c=>divOf(c)===x).length} clubes`).join(' · ')} · ${d.clubs.reduce((s,c)=>s+c.players.length,0)} jogadores</p>
  <div class="row"><button class="btn sec" data-acao="exportData">Exportar dados dos clubes (JSON)</button>
  <label class="btn sec">Carregar JSON<input type="file" accept=".json" style="display:none" data-mudar="loadDataFile"></label>
  ${store.get(DATA_KEY)?'<button class="btn sec" data-acao="resetData">Voltar aos dados padrão</button>':''}
  ${S?'<button class="btn red" data-acao="resetGame">Excluir este jogo salvo</button>':'<button class="btn" data-acao="go|menu">Tela inicial</button>'}</div>
  <p class="muted">Dados novos valem a partir do próximo jogo novo. Seu jogo atual continua com os dados com que começou.</p></div>
  <div class="card"><h3>Backup do jogo (save)</h3>
   <p class="muted">Salva a campanha inteira (elenco, tabela, finanças, histórico) num arquivo JSON. Use para não perder o progresso ou para continuar em outro navegador/computador.</p>
   <div class="row">${S?'<button class="btn" data-acao="exportSave">Exportar save (JSON)</button>':''}
   <label class="btn sec">Importar save<input type="file" accept=".json" style="display:none" data-mudar="loadSaveFile"></label></div></div>
  <div class="card"><h3>Importar da API-Football</h3>
   <p class="muted">Busca os times da série escolhida (Série A = liga 71, Série B = liga 72, Série C = liga 75, Série D = liga 76; da D ficam só os 20 clubes que foram mais longe), a classificação (para calibrar a força) e o elenco de cada clube. A série importada substitui só ela mesma nos dados atuais, então dá para importar a Série A e depois a Série B. São cerca de 22 a 27 requisições. Se o seu plano não liberar a temporada, a Série A é montada com os 20 clubes de 2026 e os elencos atuais. As Séries B, C e D precisam de uma temporada liberada (no plano gratuito, de 2022 a 2024). No plano gratuito o limite é de 10 por minuto, por isso há uma pausa entre elas e a importação leva uns 3 a 4 minutos. As requisições saem do seu navegador direto para a API.</p>
   <div class="row"><input id="apikey" type="password" placeholder="Sua chave x-apisports-key" style="flex:1;min-width:220px" value="${esc(k)}">
    <label>Série <select id="serie"><option value="A">Série A</option><option value="B">Série B</option><option value="C">Série C</option><option value="D">Série D</option></select></label>
    <label>Temporada <input id="season" type="number" value="${d.season||2026}" style="width:90px"></label>
    <label>Pausa (s) <input id="delay" type="number" value="7" style="width:70px"></label>
    <label><input id="remember" type="checkbox" ${k?'checked':''}> lembrar chave</label>
    <button class="btn" id="impbtn" data-acao="importFromApi">Importar</button></div>
   <div class="bar" style="margin-top:10px"><div id="impbar" style="width:0"></div></div>
   <div id="implog" style="margin-top:10px;max-height:240px;overflow:auto;font-family:monospace;font-size:12px"></div>
   <p class="muted">A força (40–95) de cada jogador é estimada a partir da força do clube, da idade e de uma variação fixa por jogador, porque a API não fornece atributos de jogo.</p>
  </div>`;
}

export function verRodadaJogos(n){ui.jogosRound=+n;render()}
export function verDivisao(d){ui.vDiv=d;render()}
export function proximaTemporada(){S.seasonClosed===S.season?newSeason():seasonEnd()}
