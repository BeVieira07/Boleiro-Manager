import { DIVS, MOVE_N, S, addNews, clubById, divOf, divisions, hasTwoDivs, table, userClub } from './estado.mjs';
import { clamp } from './utils.mjs';

/* ================= confiança da diretoria (#11) =================
   S.conf: 0 a 100 (começa em 60). S.meta: objetivo da temporada, tirado da força do clube na divisão.
   S.confFat: o que pesou na última rodada. S.confBaixa: rodadas seguidas com confiança <= DEMISSAO_NIVEL.
   Saves antigos assumem 60 e uma meta calculada na hora (migrarDiretoria). */
export const CONF_INICIO=60,DEMISSAO_NIVEL=10,DEMISSAO_RODADAS=3;
export const FAIXAS=[[80,'Segurança total'],[55,'Estável'],[30,'Em risco'],[0,'Demissão iminente']];
export const faixaConf=c=>FAIXAS.find(f=>c>=f[0])[1];
export function definirMeta(){
  const uc=userClub(),d=divOf(uc),ds=divisions(),di=ds.indexOf(d),n=S.clubs.filter(c=>divOf(c)===d).length;
  const esp=1+S.clubs.filter(c=>divOf(c)===d&&c.strength>uc.strength).length; // posição esperada pela força
  const mv=hasTwoDivs()?MOVE_N():4,top=di===0?6:mv,bottom=!hasTwoDivs()?4:di===ds.length-1?0:mv;
  const texto=esp<=2?'Lutar pelo título':esp<=top?(di===0?'Vaga na Libertadores':`Acesso à ${DIVS[ds[di-1]]}`):bottom&&esp>n-bottom?'Evitar o rebaixamento':'Terminar no meio da tabela';
  S.meta={texto,alvo:esp<=2?3:esp<=top?top:bottom&&esp>n-bottom?n-bottom:Math.min(n,esp+1)}; // alvo: pior posição aceita
}
export function migrarDiretoria(estado){if(estado.conf==null){estado.conf=CONF_INICIO;estado.confBaixa=0;estado.confFat=[]}if(!estado.meta)definirMeta()}
// depois de cada rodada: soma os fatores, limita a variação e confere a demissão
export function atualizarConfianca(jogo){
  const uc=userClub(),me=uc.id,fat=[];
  const add=(t,v)=>{if(v)fat.push({t,v:Math.round(v*10)/10})};
  if(jogo){const gf=jogo.h===me?jogo.hg:jogo.ag,ga=jogo.h===me?jogo.ag:jogo.hg;const adv=clubById(jogo.h===me?jogo.a:jogo.h),aj=clamp((adv.strength-uc.strength)/10,-1,1); // pesa o resultado contra a força do rival
    add(gf>ga?'Vitória':gf<ga?'Derrota':'Empate',(gf>ga?1.5:gf<ga?-1.2:0.3)+aj)}
  const seq=[];for(let r=S.round-1;r>=0&&seq.length<3;r--){const g=S.fixtures[r].find(g=>g.h===me||g.a===me);if(g)seq.push(g.hg===g.ag?0:(g.h===me)===(g.hg>g.ag)?1:-1)}
  if(seq.length===3&&seq.every(x=>x===1))add('Três vitórias seguidas',1.5);
  if(seq.length===3&&seq.every(x=>x===-1))add('Três derrotas seguidas',-1.5);
  const pos=table().findIndex(t=>t.id===me)+1;
  add(`Posição (${pos}º) contra a meta (${S.meta.alvo}º)`,clamp((S.meta.alvo-pos)*0.3,-2,2)*Math.min(1,S.round/8)); // pesa pouco nas primeiras rodadas
  // shortcut: finanças = só caixa negativo, sem comparar a folha com a receita; ampliar se a diretoria precisar cobrar gasto alto
  if(S.balance<0)add('Caixa negativo',-1.5);
  aplicarConfianca(fat,6);
}
export function aplicarConfianca(fat,lim){
  const d=clamp(fat.reduce((s,f)=>s+f.v,0),-lim,lim);
  S.conf=clamp(Math.round((S.conf+d)*10)/10,0,100);S.confFat=fat;
  S.confBaixa=S.conf<=DEMISSAO_NIVEL?(S.confBaixa||0)+1:0;
  if(S.confBaixa>=DEMISSAO_RODADAS&&!S.demitido){S.demitido=true;addNews('🔥 A diretoria demitiu você.')}
}
export function confiancaFimTemporada(pos){
  const dif=S.meta.alvo-pos,ok=dif>=0;
  aplicarConfianca([{t:`Fim de temporada: ${pos}º (meta: ${S.meta.texto})`,v:ok?Math.min(15,5+dif*2):Math.max(-20,dif*3)}],20);
}
// confiança volta a meia distância do neutro a cada temporada
export function confiancaNovaTemporada(){S.conf=Math.round((S.conf+CONF_INICIO)/2);S.confBaixa=0;definirMeta();addNews(`🎯 Meta da diretoria: ${S.meta.texto}.`)}
