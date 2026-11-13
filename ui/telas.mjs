import { loanOf, wageBill } from '../core/emprestimos.mjs';
import { escalarMelhores } from '../core/escalacao.mjs';
import { DIVS, MOVE_N, P, S, clubById, divOf, divisions, divsOf, hasTwoDivs, table, tec, tecnicos, topScorers, tvQuota, userClub } from '../core/estado.mjs';
import { getXI } from '../core/motor.mjs';
import { POSD, POSD_ORDEM, posDSigla } from '../core/posicoes.mjs';
import { clamp, esc, money, norm } from '../core/utils.mjs';
import { API, exportData, exportSave, importFromApi, loadDataFile, loadSaveFile, resetData, resetGame } from './api.mjs';
import { painelDiretoria } from './diretoria.mjs';
import { loanBtn, loanTag, vLoans } from './emprestimos.mjs';
import { vEscalacao } from './escalacao.mjs';
import { MAX_TECNICOS, getData, newGame, save, ui } from './estado.mjs';
import { tendenciaTag } from './forma.mjs';
import { chip, ovrChip, stat } from './componentes.mjs';
import { icone } from './icones.mjs';
import { TITULOS, barraAcoes, lateral } from './layout.mjs';
import { acceptOffer, makeBid, quickSell, rejectOffer, toggleListed } from './mercado.mjs';
import { botaoRodada, playRound, simToEnd } from './motor.mjs';
import { crest, newSeason, seasonEnd } from './partida.mjs';
import { posTag } from './posicoes.mjs';
import { vClube } from './clube.mjs';
import { vElenco } from './elenco.mjs';
import { vLigas, vLobby } from './liga.mjs';
import { vMenu, voltarMenu } from './saves.mjs';
import { painelTatica } from './taticas.mjs';
import { APIKEY_KEY, DATA_KEY, store } from './utils.mjs';

/* ================= telas ================= */
export function go(v){ui.view=v;ui.maisAberto=false;render();window.scrollTo(0,0)}
export const curDiv=()=>ui.vDiv&&divisions().includes(ui.vDiv)?ui.vDiv:divOf(userClub());
export const inDiv=(g,d)=>divOf(clubById(g.h))===d;
export function divTabs(){
  if(!hasTwoDivs())return '';
  return `<div class="chips" role="group" aria-label="Série" style="margin-bottom:var(--e4)">${divisions().map(d=>chip(DIVS[d],`verDivisao|${d}`,curDiv()===d)).join('')}</div>`;
}
export function render(){
  if(!S&&!['dados','inicio','ligas','lobby'].includes(ui.view))ui.view='menu';
  if(S&&!TITULOS[ui.view])ui.view='clube';
  // #58: menu lateral (computador) / barra inferior (celular) e barra de ações no topo de cada tela do jogo
  document.body.classList.toggle('em-jogo',!!S);
  document.getElementById('lateral').innerHTML=lateral();
  const V={menu:vMenu,inicio:vInicio,clube:vClube,elenco:vElenco,escalacao:vEscalacao,tabela:vTabela,jogos:vJogos,artilharia:vArt,mercado:vMercado,financas:vFin,dados:vDados,rodada:vRodada,ligas:vLigas,lobby:vLobby};
  const topo=S?barraAcoes(TITULOS[ui.view]):ui.view==='menu'?'':`<div class="topo-simples"><button class="btn fantasma" data-acao="go|menu">${icone('voltar')}Tela inicial</button></div>`;
  document.getElementById('app').innerHTML=topo+V[ui.view]();
}
export function stars(s){const n=clamp(Math.round((s-62)/4),1,5);return '★'.repeat(n)+'☆'.repeat(5-n)}
export function vInicio(){
  const d=getData(),ds=divsOf(d.clubs);
  const card=c=>`<div class="card clubcard" data-acao="newGame|${c.id}">${crest(c)}<div><b>${esc(c.name)}</b></div><div class="stars">${stars(c.strength)}</div><div class="muted">${c.players.length} jogadores</div></div>`;
  return `<h2>Novo jogo</h2>
  <div class="card row"><span>Dados: <b>${d.source==='api'?'API-Football (reais)':'Exemplo (jogadores fictícios)'}</b> — temporada ${d.season}, ${ds.map(x=>`${DIVS[x]} (${d.clubs.filter(c=>divOf(c)===x).length} clubes)`).join(' + ')}.</span>
  <button class="btn sec sm" data-acao="go|dados">${d.source==='api'?'Gerenciar dados':'Importar dados reais'}</button>
  <label class="btn sec sm">Carregar save<input type="file" accept=".json" style="display:none" data-mudar="loadSaveFile"></label></div>
  ${painelTecnicos(d)}
  <h3>${ui.novos.length?`Clube de ${esc((ui.novos.find(t=>!t.clubId)||{nome:'...'}).nome)}`:'Escolha seu clube'}</h3>
  ${ds.map(x=>`${ds.length>1?`<h3>${DIVS[x]}</h3>`:''}<div class="grid">${d.clubs.filter(c=>divOf(c)===x).sort((a,b)=>b.strength-a.strength).map(card).join('')}</div>`).join('')}`;
}
export function resultLine(g,me){
  const H=clubById(g.h),A=clubById(g.a);
  const cls=me&&(g.h===me||g.a===me)?' class="me"':'';
  return `<tr${cls}><td class="n">${crest(H)} ${esc(H.name)}</td><td style="text-align:center"><b>${g.hg==null?'x':g.hg+' x '+g.ag}</b></td><td>${esc(A.name)} ${crest(A)}</td></tr>`;
}
// zonas da classificação de uma série: G (Libertadores ou acesso) e Z (rebaixamento)
export function zonas(d){
  const two=hasTwoDivs(),mv=two?MOVE_N():4,ds=divisions(),di=ds.indexOf(d),last=di===ds.length-1,top=di===0?6:mv,bottom=!two?4:last?0:mv;
  return {top,bottom,nomeTop:di===0?'Libertadores (G6)':`Acesso à ${DIVS[ds[di-1]]} (G${mv})`,nomeBottom:bottom?`Rebaixamento${two?' para a '+DIVS[ds[di+1]]:''} (Z${bottom})`:''};
}
export function autoLineup(){escalarMelhores();save();render()}
export function vTabela(){
  const d=curDiv(),T=table(d),me=tec().clubId,two=hasTwoDivs(),mv=two?MOVE_N():4;
  const ds=divisions(),di=ds.indexOf(d),last=di===ds.length-1;
  const top=di===0?6:mv,bottom=!two?4:last?0:mv;
  return `${divTabs()}
  <p class="muted"><span style="color:var(--info)">▌</span> ${di===0?'Libertadores (G6)':`Acesso à ${DIVS[ds[di-1]]} (G${mv})`}${bottom?` &nbsp; <span style="color:var(--danger)">▌</span> Rebaixamento${two?' para a '+DIVS[ds[di+1]]:''} (Z${bottom})`:''}</p>
  <div class="card tw"><table><tr><th>#</th><th>Clube</th><th class="n">Pts</th><th class="n">J</th><th class="n">V</th><th class="n">E</th><th class="n">D</th><th class="n">GP</th><th class="n">GC</th><th class="n">SG</th></tr>
  ${T.map((t,i)=>{const c=clubById(t.id);return `<tr class="${t.id===me?'me':''}"><td class="${i<top?'zone-lib':bottom&&i>=T.length-bottom?'zone-z4':''}">${i+1}</td><td><span class="club">${crest(c)} ${esc(c.name)}</span></td><td class="n"><b>${t.Pts}</b></td><td class="n">${t.J}</td><td class="n">${t.V}</td><td class="n">${t.E}</td><td class="n">${t.D}</td><td class="n">${t.GP}</td><td class="n">${t.GC}</td><td class="n">${t.GP-t.GC}</td></tr>`}).join('')}
  </table></div>`;
}
export function vJogos(){
  const r=ui.jogosRound??Math.min(S.round,S.fixtures.length-1);
  const d=curDiv();
  return `${divTabs()}<div class="card row"><button class="btn sec sm" data-acao="verRodadaJogos|${Math.max(0,r-1)}">◀</button>
  <b>Rodada ${r+1}</b><button class="btn sec sm" data-acao="verRodadaJogos|${Math.min(S.fixtures.length-1,r+1)}">▶</button></div>
  <div class="card tw"><table>${S.fixtures[r].filter(g=>inDiv(g,d)).map(g=>resultLine(g,tec().clubId)).join('')}</table></div>`;
}
export function vRodada(){
  if(!ui.lastRound)return vClube();
  const me=tec().clubId,d=curDiv();
  return `<p class="muted">Rodada ${ui.lastRound.round}</p>${divTabs()}
  <div class="card tw"><table>${ui.lastRound.games.filter(g=>inDiv(g,d)).map(g=>resultLine(g,me)).join('')}</table></div>
  <div class="row">${S.round<S.fixtures.length?botaoRodada('btn big',`▶ Jogar rodada ${S.round+1}`):''}<button class="btn sec" data-acao="go|tabela">Ver tabela</button><button class="btn sec" data-acao="go|clube">Clube</button></div>`;
}
export function vArt(){
  const d=curDiv(),L=topScorers(25,d);
  return `${divTabs()}<div class="card tw"><table><tr><th>#</th><th>Jogador</th><th>Clube</th><th class="n">Gols</th></tr>
  ${L.map((p,i)=>`<tr class="${p.clubId===tec().clubId?'me':''}"><td>${i+1}</td><td>${posTag(p)} ${esc(p.name)}</td><td>${esc(clubById(p.clubId).name)}</td><td class="n"><b>${p.goals}</b></td></tr>`).join('')||'<tr><td class="muted">Nenhum gol ainda.</td></tr>'}</table></div>`;
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
  return `
  <div class="card row">
   <select data-mudar="setMF|pos"><option value="">Todas as posições</option>${Object.entries(POSD).map(([k,d])=>`<option value="${k}" ${ui.mf.pos===k?'selected':''}>${d.nome}</option>`).join('')}</select>
   <select data-mudar="setMF|club"><option value="">Todos os clubes</option>${S.clubs.filter(c=>c.id!==uc.id).sort((a,b)=>a.name.localeCompare(b.name)).map(c=>`<option value="${c.id}" ${ui.mf.club===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select>
   <input placeholder="Buscar nome" value="${esc(ui.mf.q)}" data-mudar="setMF|q">
   <input placeholder="Valor máx. (mi)" style="width:130px" value="${esc(ui.mf.max)}" data-mudar="setMF|max">
   <span class="pill">Caixa: <b>${money(userClub().balance)}</b></span><span class="pill">Elenco: ${uc.players.length}/32</span>
  </div>
  <p class="muted">${total} jogadores${total>120?' (mostrando os 120 melhores)':''}. Craques do time vendedor custam mais caro. Uma proposta por jogador a cada rodada.</p>
  <div class="card tw"><table><tr><th>Pos</th><th>Nome</th><th>Clube</th><th class="n">Idade</th><th class="n">Força</th><th class="n">Valor</th><th class="n">Salário/rod.</th><th></th></tr>
  ${L.map(p=>`<tr><td>${posTag(p)}</td><td>${esc(p.name)}${loanTag(p)}</td><td>${esc(clubById(p.clubId).name)}</td><td class="n">${p.age}</td><td class="c">${ovrChip(p.ovr)}</td><td class="n">${money(p.value)}</td><td class="n">${money(p.wage)}</td><td>${loanOf(p.id)?'':`<button class="btn sm" data-acao="makeBid|${p.id}">Proposta</button> ${loanBtn(p,'in')}`}</td></tr>`).join('')}
  </table></div>`;
}
export function vFin(){
  const uc=userClub(),w=wageBill(uc);
  const val=uc.players.reduce((s,p)=>s+p.value,0);
  return `
  <div class="stats">
   ${stat({rotulo:'Caixa',valor:money(uc.balance),cor:uc.balance<0?'var(--perigo)':'var(--verde)'})}
   ${stat({rotulo:'Folha salarial',valor:money(w),unid:'por rodada'})}
   ${stat({rotulo:'Valor do elenco',valor:money(val),unid:`${uc.players.length} jogadores`})}
   ${stat({rotulo:'Receitas',valor:money(tvQuota(divOf(uc))),unid:'de TV por rodada',sub:'Mais bilheteria em casa e premiação no fim da temporada'})}
  </div>
  <div class="card tw"><h3>Movimentações</h3><table><tr><th>Temp.</th><th>Rod.</th><th>Descrição</th><th class="n">Valor</th></tr>
  ${userClub().fin.map(f=>`<tr><td>${f.s}</td><td>${f.r+1}</td><td>${esc(f.desc)}</td><td class="n ${f.amount<0?'bad':'ok'}">${money(f.amount)}</td></tr>`).join('')||'<tr><td class="muted">Sem movimentações.</td></tr>'}</table></div>`;
}
export function vDados(){
  const d=getData(),k=store.get(APIKEY_KEY)||'';
  return `${S?'':'<h2>Dados do jogo</h2>'}
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

// novo jogo: painel para jogar com vários técnicos no mesmo computador (#29)
export function painelTecnicos(d){
  const nomeClube=id=>{const c=d.clubs.find(x=>x.id===id);return c?esc(c.name):'<span class="muted">escolha o clube abaixo</span>'};
  if(!ui.novos.length)return `<div class="card row"><span>Jogar com amigos no mesmo computador?</span>
   <input id="nomeTec" placeholder="Nome do técnico" style="width:180px"><button class="btn sec sm" data-acao="adicionarTecnico">Adicionar técnico</button>
   <span class="muted">Adicione os técnicos e escolha o clube de cada um. Eles revezam a vez a cada rodada.</span></div>`;
  const prontos=ui.novos.length>=2&&ui.novos.every(t=>t.clubId);
  return `<div class="card"><h3>Técnicos (${ui.novos.length}/${MAX_TECNICOS})</h3>
   <table>${ui.novos.map((t,i)=>`<tr><td><b>${esc(t.nome)}</b></td><td>${nomeClube(t.clubId)}</td><td><button class="btn red sm" data-acao="removerTecnico|${i}">Remover</button></td></tr>`).join('')}</table>
   <div class="row">${ui.novos.length<MAX_TECNICOS?'<input id="nomeTec" placeholder="Nome do técnico" style="width:180px"><button class="btn sec sm" data-acao="adicionarTecnico">Adicionar técnico</button>':''}
   <button class="btn" data-acao="comecarComTecnicos" ${prontos?'':'disabled'}>Começar com ${ui.novos.length} técnicos</button>
   <button class="btn sec sm" data-acao="cancelarTecnicos">Cancelar</button></div></div>`;
}
