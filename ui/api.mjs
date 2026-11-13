import { erroIds } from '../core/dados.mjs';
import { migrarDiretoria } from '../core/diretoria.mjs';
import { DIVS, S, divOf, divsOf, reindex, usarEstado, userClub } from '../core/estado.mjs';
import { migrarPosicoes } from '../core/posicoes.mjs';
import { norm } from '../core/utils.mjs';
import { getData, save, ui } from './estado.mjs';
import { excluirSave, podeCriarSave } from './saves.mjs';
import { render } from './telas.mjs';
import { DATA_KEY, store } from './utils.mjs';
import { avisar, confirmar } from './avisos.mjs';
import { bloqueadoNaLiga } from './ligajogo.mjs';

/* ================= dados e saves em arquivo (aba Dados) =================
   A importação pela API-Football saiu do navegador (#52): os dados vêm de scripts/baixar-brasileirao.mjs (npm run dados). */
export function exportData(){
  const data=store.get(DATA_KEY)||getData();
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  a.download=`brasileirao-${data.season}-${data.source}.json`;a.click();
}
// junta os clubes de uma série (div) aos dados atuais, substituindo só aquela série
export function mergeDivision(cur,inc,div){
  const ids=new Set(inc.clubs.map(c=>c.id));
  inc.clubs.forEach(c=>c.division=div);
  const kept=(cur.clubs||[]).filter(c=>divOf(c)!==div&&!ids.has(c.id));
  return {...inc,clubs:[...kept,...inc.clubs].sort((x,y)=>divOf(x).localeCompare(divOf(y)))};
}
export function loadDataFile(_valor,ev){
  const f=ev.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{let d;try{d=JSON.parse(rd.result);if(!Array.isArray(d.clubs))throw 0}catch(e){avisar('Arquivo inválido.','erro');return}
    const erro=erroIds(d.clubs);if(erro){avisar(erro,'erro');return}
    const fd=divsOf(d.clubs),cur=getData(),other=divsOf(cur.clubs).filter(x=>x!==fd[0]);
    const usar=x=>{store.set(DATA_KEY,x);avisar(`Dados carregados: ${x.clubs.length} clubes (${x.season}).`,'ok');render()};
    if(fd.length===1&&other.length)confirmar({titulo:'Juntar os dados?',texto:`Este arquivo só tem a ${DIVS[fd[0]]}. Juntar com o que já está carregado (${other.map(x=>DIVS[x]).join(', ')})? Se não, o jogo passa a usar só este arquivo.`,ok:'Juntar',cancelar:'Usar só este arquivo'},()=>usar(mergeDivision(cur,d,fd[0])),()=>usar(d));
    else usar(d)};
  rd.readAsText(f);
}
export function downloadJSON(obj,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
export function exportSave(){
  if(!S){avisar('Nenhum jogo em andamento.');return}
  const uc=userClub();
  downloadJSON({type:'brasfoot-save',version:1,exportedAt:new Date().toISOString(),save:S},`save-${norm(uc.short||uc.name)}-${S.season}-r${S.round}.json`);
}
export function loadSaveFile(_valor,ev){
  const f=ev.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{try{const j=JSON.parse(rd.result);const sv=j.type==='brasfoot-save'?j.save:j;
    if(!sv||!Array.isArray(sv.clubs)||!Array.isArray(sv.fixtures)||!(sv.userClubId||sv.managers))throw 0;
    const erro=erroIds(sv.clubs);if(erro){avisar(erro,'erro');return}
    if(!podeCriarSave())return; // importar cria um save novo na lista, sem substituir os outros
    delete sv.saveId;usarEstado(sv);migrarPosicoes(S);reindex();migrarDiretoria(S);save();ui.view='clube';render();avisar(`Save carregado: ${userClub().name}, temporada ${S.season}, rodada ${S.round+1}.`)}
  catch(e){avisar('Arquivo de save inválido.','erro')}};
  rd.readAsText(f);
}
export function resetData(){confirmar({titulo:'Voltar aos dados padrão?',texto:'Os dados importados neste navegador serão apagados e o jogo volta a usar o Brasileirão 2024. Seus jogos salvos não mudam.',ok:'Voltar aos dados padrão',perigo:true},()=>{store.del(DATA_KEY);render()})}
export function resetGame(){if(bloqueadoNaLiga())return;if(S&&S.saveId)excluirSave(S.saveId)}
