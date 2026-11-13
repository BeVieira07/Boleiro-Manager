import { BASE_CLUBS, SQUAD_SHAPE, baseInfo, fakePlayer } from '../core/dados.mjs';
import { migrarDiretoria } from '../core/diretoria.mjs';
import { DIVS, S, divOf, divsOf, reindex, usarEstado, userClub } from '../core/estado.mjs';
import { migrarPosicoes } from '../core/posicoes.mjs';
import { esc, hashStr, mulberry32, norm } from '../core/utils.mjs';
import { getData, save, ui } from './estado.mjs';
import { excluirSave, podeCriarSave } from './saves.mjs';
import { render } from './telas.mjs';
import { APIKEY_KEY, DATA_KEY, store } from './utils.mjs';

/* ================= importação API-Football ================= */
export const API='https://v3.football.api-sports.io';
export const sleep=ms=>new Promise(r=>setTimeout(r,ms));
export async function apiGet(path,key){
  const res=await fetch(API+path,{headers:{'x-apisports-key':key}});
  if(!res.ok)throw new Error('HTTP '+res.status);
  const j=await res.json();
  const errs=j.errors&&(Array.isArray(j.errors)?j.errors:Object.values(j.errors));
  if(errs&&errs.length)throw new Error(errs.join(' | '));
  return j;
}
export async function importFromApi(){
  const key=document.getElementById('apikey').value.replace(/[^A-Za-z0-9]/g,'');
  const season=parseInt(document.getElementById('season').value,10);
  const LEAGUES={A:71,B:72,C:75,D:76},serie=LEAGUES[document.getElementById('serie').value]?document.getElementById('serie').value:'A',league=LEAGUES[serie];
  const delay=parseInt(document.getElementById('delay').value,10)*1000;
  const log=document.getElementById('implog'),bar=document.getElementById('impbar');
  const out=t=>{log.insertAdjacentHTML('beforeend',`<div>${esc(t)}</div>`);log.scrollTop=1e9};
  if(!key){alert('Cole sua chave da API-Football.');return}
  if(document.getElementById('remember').checked)store.set(APIKEY_KEY,key);else store.del(APIKEY_KEY);
  document.getElementById('impbtn').disabled=true;log.innerHTML='';
  try{
    let usedSeason=season,list=null,rank={};
    try{out(`Buscando times da ${DIVS[serie]} ${season}…`);const j=await apiGet(`/teams?league=${league}&season=${season}`,key);
      if(j.results>0)list=j.response.map(x=>({t:x.team,b:baseInfo(x.team.name)}))}
    catch(e){out(`Temporada ${season}: ${e.message}`)}
    if(list){
      out(`${list.length} times encontrados (temporada ${season}).`);
      let st=null;
      try{await sleep(delay);st=await apiGet(`/standings?league=${league}&season=${season}`,key);
        const rows=st.response?.[0]?.league?.standings?.[0]||[];rows.forEach(r=>rank[r.team.id]=r.rank);
        out(rows.length?'Classificação obtida — força dos times ajustada pela tabela.':'Sem classificação disponível.');}
      catch(e){out('Classificação indisponível: '+e.message)}
      if(serie==='D'){ // 64 clubes em grupos: fica com os 20 que foram mais longe (quem avança joga mais; desempate pelos pontos na 1ª fase)
        const pts={},ko={};
        for(const g of st?.response?.[0]?.league?.standings||[])for(const r of g)pts[r.team.id]=r.points;
        try{await sleep(delay);out('Buscando os jogos para achar os 20 clubes que foram mais longe…');const fx=await apiGet(`/fixtures?league=${league}&season=${season}`,key);
          for(const f of fx.response||[])for(const id of [f.teams.home.id,f.teams.away.id])ko[id]=(ko[id]||0)+1}
        catch(e){out('Jogos indisponíveis: '+e.message)}
        const score=id=>(ko[id]||0)*1000+(pts[id]||0);
        list=list.sort((a,b)=>score(b.t.id)-score(a.t.id)).slice(0,20);
        for(const k in rank)delete rank[k];list.forEach((x,i)=>rank[x.t.id]=i+1);
        out(`Série D: ficaram os 20 clubes que foram mais longe (${list.map(x=>x.t.name).join(', ')}).`);
      }
    }else if(serie!=='A'){
      throw new Error(`Seu plano não libera a ${DIVS[serie]} ${season}. Tente uma temporada liberada (no plano gratuito, de 2022 a 2024).`);
    }else{
      out('Seu plano não libera essa temporada. Vou montar a Série A 2026 (20 clubes) com os ELENCOS ATUAIS, que não dependem de temporada.');
      let known=[];
      for(const s of [2024,2023,2022]){
        await sleep(delay);
        try{const j=await apiGet(`/teams?league=71&season=${s}`,key);known=j.response.map(x=>x.team);out(`IDs de ${known.length} clubes obtidos da temporada ${s}.`);break}
        catch(e){out(`Temporada ${s}: ${e.message}`)}
      }
      const match=(t,b)=>b[4].some(k=>norm(t.name).includes(k));
      list=[];
      for(const b of BASE_CLUBS){
        let t=known.find(t=>match(t,b));
        if(!t){
          await sleep(delay);
          const q=b[4][0].includes('-')?norm(b[0]):b[4][0];
          try{out(`Procurando ${b[0]}…`);const j=await apiGet(`/teams?search=${encodeURIComponent(q)}&country=Brazil`,key);
            t=(j.response||[]).map(x=>x.team).filter(t=>match(t,b)).sort((x,y)=>x.name.length-y.name.length)[0];
            out(t?`   encontrado: ${t.name} (id ${t.id})`:'   não encontrado — elenco gerado.')}
          catch(e){out(`   erro: ${e.message}`)}
        }
        list.push({t:t||null,b});
      }
    }
    const clubs=[];
    for(let i=0;i<list.length;i++){
      const {t,b}=list[i];
      // força base por série: B = 64 (ou a da Série A menos 4 para clubes conhecidos), C = 59 (ou menos 9), D = 55 (ou menos 13)
      const DROP={A:0,B:4,C:9,D:13},BASE={A:68,B:64,C:59,D:55},TOP={A:80,B:70,C:64,D:59},STEP={A:0.8,B:0.5,C:0.4,D:0.3};
      let strength=b?b[2]-DROP[serie]:BASE[serie];
      if(t&&rank[t.id]&&Object.values(rank).length>=10){const fromRank=TOP[serie]-(rank[t.id]-1)*STEP[serie];strength=Math.round((strength+fromRank)/2)}
      const club={id:'c'+(t?t.id:b[1]),name:b?b[0]:t.name,short:((t&&t.code)||(b&&b[1])||t.name.slice(0,3)).toUpperCase(),color:b?b[3]:'#335',logo:t?t.logo:null,strength,division:serie,players:[]};
      if(t){await sleep(delay);
      try{
        out(`(${i+1}/${list.length}) Elenco do ${club.name}…`);
        const j=await apiGet(`/players/squads?team=${t.id}`,key);
        const pl=j.response?.[0]?.players||[];
        const map={Goalkeeper:'G',Defender:'D',Midfielder:'M',Attacker:'A'};
        club.players=pl.filter(p=>map[p.position]).map(p=>({id:'p'+p.id,name:p.name,age:p.age||24,pos:map[p.position],number:p.number,photo:p.photo}));
        out(`   ${club.players.length} jogadores.`);
      }catch(e){out(`   Erro: ${e.message} — usando elenco gerado.`)}}
      if(club.players.length<16){const r=mulberry32(hashStr(club.id));let k=0;for(const [pos,n] of Object.entries(SQUAD_SHAPE))while(club.players.filter(p=>p.pos===pos).length<n)club.players.push(fakePlayer(club.id,k++,strength,pos,r))}
      clubs.push(club);bar.style.width=((i+1)/list.length*100)+'%';
    }
    const data=mergeDivision(getData(),{source:'api',season,createdAt:new Date().toISOString(),clubs},serie);
    if(data.clubs.length>clubs.length)out(`Juntado com os ${data.clubs.length-clubs.length} clubes da outra série já carregada.`);
    if(!store.set(DATA_KEY,data))out('Aviso: não consegui salvar no navegador. Use "Exportar dados".');
    window._lastData=data;
    out(`✅ Importação concluída: ${clubs.length} clubes, ${clubs.reduce((s,c)=>s+c.players.length,0)} jogadores. Inicie um novo jogo para usar os dados reais.`);
  }catch(e){out('❌ '+e.message);if(/application key|token/i.test(e.message))out('Dica: a API não reconheceu a chave enviada pelo navegador. Teste a chave no Soccer Tester do painel ou use o script baixar-brasileirao.mjs e depois "Carregar JSON".')}
  finally{const b=document.getElementById('impbtn');if(b)b.disabled=false}
}
export function exportData(){
  const data=store.get(DATA_KEY)||window._lastData||getData();
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
  rd.onload=()=>{try{let d=JSON.parse(rd.result);if(!Array.isArray(d.clubs))throw 0;
    const fd=divsOf(d.clubs),cur=getData(),other=divsOf(cur.clubs).filter(x=>x!==fd[0]);
    if(fd.length===1&&other.length&&confirm(`Este arquivo só tem a ${DIVS[fd[0]]}. Juntar com o que já está carregado (${other.map(x=>DIVS[x]).join(', ')})?\n(Cancelar = usar só este arquivo)`))d=mergeDivision(cur,d,fd[0]);
    store.set(DATA_KEY,d);alert(`Dados carregados: ${d.clubs.length} clubes (${d.season}).`);render()}catch(e){alert('Arquivo inválido.')}};
  rd.readAsText(f);
}
export function downloadJSON(obj,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}));a.download=name;document.body.appendChild(a);a.click();a.remove()}
export function exportSave(){
  if(!S){alert('Nenhum jogo em andamento.');return}
  const uc=userClub();
  downloadJSON({type:'brasfoot-save',version:1,exportedAt:new Date().toISOString(),save:S},`save-${norm(uc.short||uc.name)}-${S.season}-r${S.round}.json`);
}
export function loadSaveFile(_valor,ev){
  const f=ev.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{try{const j=JSON.parse(rd.result);const sv=j.type==='brasfoot-save'?j.save:j;
    if(!sv||!Array.isArray(sv.clubs)||!Array.isArray(sv.fixtures)||!(sv.userClubId||sv.managers))throw 0;
    if(!podeCriarSave())return; // importar cria um save novo na lista, sem substituir os outros
    delete sv.saveId;usarEstado(sv);migrarPosicoes(S);reindex();migrarDiretoria(S);save();ui.view='clube';render();alert(`Save carregado: ${userClub().name}, temporada ${S.season}, rodada ${S.round+1}.`)}
  catch(e){alert('Arquivo de save inválido.')}};
  rd.readAsText(f);
}
export function resetData(){if(confirm('Voltar para os dados padrão (Brasileirão 2024)?')){store.del(DATA_KEY);render()}}
export function resetGame(){if(S&&S.saveId)excluirSave(S.saveId)}
