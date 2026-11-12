/* ================= jogos salvos e tela inicial (#21) =================
   Cada campanha fica em localStorage[SAVE_PREFIX+id]; SAVES_KEY guarda o índice {cur, list:[resumo]}.
   S.saveId diz em qual save o jogo atual é gravado. O save antigo de slot único (SAVE_KEY) é migrado na primeira abertura. */
const SAVES_KEY='brasfoot_saves_v2', SAVE_PREFIX='brasfoot_save_v2_', MAX_SAVES=5; // cada save ocupa uns 600 mil caracteres; o navegador costuma dar uns 5 milhões por site
const indiceSaves=()=>{const i=store.get(SAVES_KEY);return i&&Array.isArray(i.list)?i:{cur:null,list:[]}};
function resumoSave(s){
  const c=s.clubs.find(x=>x.id===s.userClubId)||{};
  return {id:s.saveId,clube:c.name||'?',clubId:c.id,div:c.division||null,season:s.season,round:Math.min(s.round+1,(s.fixtures||[]).length),total:(s.fixtures||[]).length,data:new Date().toISOString()};
}
// grava o jogo atual no seu save (cria um save novo na primeira vez)
function salvarJogo(){
  if(!S)return true;
  const idx=indiceSaves();
  if(!S.saveId)S.saveId=Date.now().toString(36)+Math.floor(Math.random()*1e4).toString(36); // id do save não é regra do jogo
  if(!store.set(SAVE_PREFIX+S.saveId,S)){
    if(!salvarJogo.avisou)alert('Não há espaço para salvar no navegador. Exclua um jogo salvo na tela inicial (ou exporte e apague algum).');
    salvarJogo.avisou=true;return false;
  }
  idx.list=[resumoSave(S),...idx.list.filter(x=>x.id!==S.saveId)];idx.cur=S.saveId;
  store.set(SAVES_KEY,idx);return true;
}
function podeCriarSave(){
  if(indiceSaves().list.length<MAX_SAVES)return true;
  alert(`Você já tem ${MAX_SAVES} jogos salvos. Exclua um na tela inicial para começar outro.`);return false;
}
function migrarSaveAntigo(){
  const old=store.get(SAVE_KEY);if(!old||!Array.isArray(old.clubs))return;
  S=old;const ok=salvarJogo();S=null;
  if(ok)store.del(SAVE_KEY);
}
function abrirSave(id){
  const s=store.get(SAVE_PREFIX+id);
  if(!s||!Array.isArray(s.clubs)){alert('Este save não pôde ser lido.');return}
  S=s;S.saveId=id;migrarPosicoes(S);reindex();migrarDiretoria(S);
  const idx=indiceSaves();idx.cur=id;store.set(SAVES_KEY,idx);
  selEsc=null;vDiv=null;go('clube');
}
function excluirSave(id){
  const idx=indiceSaves(),e=idx.list.find(x=>x.id===id);
  if(!confirm(`Excluir o jogo salvo ${e?e.clube+' — temporada '+e.season:''}? Isso não pode ser desfeito.`))return;
  apagarSave(id);if(S&&S.saveId===id)S=null;
  view='menu';render();
}
function apagarSave(id){const idx=indiceSaves();store.del(SAVE_PREFIX+id);idx.list=idx.list.filter(x=>x.id!==id);if(idx.cur===id)idx.cur=null;store.set(SAVES_KEY,idx)}
function voltarMenu(){if(S)salvarJogo();S=null;go('menu')}
function novoJogo(){if(podeCriarSave()){S=null;go('inicio')}}
function vMenu(){
  const idx=indiceSaves(),cur=idx.list.find(x=>x.id===idx.cur)||idx.list[0];
  const clube=id=>(getData().clubs||[]).find(c=>c.id===id);
  const quando=d=>{try{return new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}catch(e){return ''}};
  const linha=x=>{const c=clube(x.clubId);
    return `<tr><td>${c?crest(c):''}</td><td><b>${esc(x.clube)}</b>${x.div&&DIVS[x.div]?` <span class="muted">${DIVS[x.div]}</span>`:''}</td>
    <td>Temporada ${x.season}</td><td>Rodada ${x.round}/${x.total}</td><td class="muted">${quando(x.data)}</td>
    <td><button class="btn sm" onclick="abrirSave('${x.id}')">Abrir</button> <button class="btn red sm" onclick="excluirSave('${x.id}')">Excluir</button></td></tr>`};
  return `<div class="menu-ini">
  <h1>⚽ Boleiro Manager</h1>
  <div class="row">
   ${cur?`<button class="btn" onclick="abrirSave('${cur.id}')">▶ Continuar — ${esc(cur.clube)}, temporada ${cur.season}</button>`:''}
   <button class="btn ${cur?'sec':''}" onclick="novoJogo()">＋ Novo jogo</button>
   <label class="btn sec">Importar save<input type="file" accept=".json" style="display:none" onchange="loadSaveFile(event)"></label>
   <button class="btn sec" onclick="go('dados')">Dados do jogo</button>
  </div>
  <div class="card tw"><h3>Jogos salvos (${idx.list.length}/${MAX_SAVES})</h3>
   ${idx.list.length?`<table>${idx.list.map(linha).join('')}</table>`:'<p class="muted">Nenhum jogo salvo ainda. Comece um novo jogo.</p>'}
  </div></div>`;
}
