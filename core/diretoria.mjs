import { DIVS, MOVE_N, S, addNews, clubById, clubDo, divOf, divisions, hasTwoDivs, table, tec, userClub } from './estado.mjs';
import { clamp } from './utils.mjs';

/* ================= confiança da diretoria (#11) =================
   Por técnico (S.managers[id]): conf: 0 a 100 (começa em 60). meta: objetivo da temporada, tirado da força do clube na divisão.
   confFat: o que pesou na última rodada. confBaixa: rodadas seguidas com confiança <= DEMISSAO_NIVEL.
   Saves antigos assumem 60 e uma meta calculada na hora (migrarDiretoria). */
export const CONF_INICIO=60,DEMISSAO_NIVEL=10,DEMISSAO_RODADAS=3;
export const FAIXAS=[[80,'Segurança total'],[55,'Estável'],[30,'Em risco'],[0,'Demissão iminente']];
export const faixaConf=c=>FAIXAS.find(f=>c>=f[0])[1];
export function definirMeta(t=tec()){
  const uc=clubDo(t),d=divOf(uc),ds=divisions(),di=ds.indexOf(d),n=S.clubs.filter(c=>divOf(c)===d).length;
  const esp=1+S.clubs.filter(c=>divOf(c)===d&&c.strength>uc.strength).length; // posição esperada pela força
  const mv=hasTwoDivs()?MOVE_N():4,top=di===0?6:mv,bottom=!hasTwoDivs()?4:di===ds.length-1?0:mv;
  const texto=esp<=2?'Lutar pelo título':esp<=top?(di===0?'Vaga na Libertadores':`Acesso à ${DIVS[ds[di-1]]}`):bottom&&esp>n-bottom?'Evitar o rebaixamento':'Terminar no meio da tabela';
  t.meta={texto,alvo:esp<=2?3:esp<=top?top:bottom&&esp>n-bottom?n-bottom:Math.min(n,esp+1)}; // alvo: pior posição aceita
}
export function migrarDiretoria(estado){for(const t of Object.values(estado.managers||{})){if(t.conf==null){t.conf=CONF_INICIO;t.confBaixa=0;t.confFat=[]}if(!t.meta)definirMeta(t)}}
// depois de cada rodada: soma os fatores, limita a variação e confere a demissão
export function atualizarConfianca(t,jogo){
  const uc=clubDo(t),me=uc.id,fat=[];
  const add=(txt,v)=>{if(v)fat.push({t:txt,v:Math.round(v*10)/10})};
  if(jogo){const gf=jogo.h===me?jogo.hg:jogo.ag,ga=jogo.h===me?jogo.ag:jogo.hg;const adv=clubById(jogo.h===me?jogo.a:jogo.h),aj=clamp((adv.strength-uc.strength)/10,-1,1); // pesa o resultado contra a força do rival
    add(gf>ga?'Vitória':gf<ga?'Derrota':'Empate',(gf>ga?1.5:gf<ga?-1.2:0.3)+aj)}
  const seq=[];for(let r=S.round-1;r>=0&&seq.length<3;r--){const g=S.fixtures[r].find(g=>g.h===me||g.a===me);if(g)seq.push(g.hg===g.ag?0:(g.h===me)===(g.hg>g.ag)?1:-1)}
  if(seq.length===3&&seq.every(x=>x===1))add('Três vitórias seguidas',1.5);
  if(seq.length===3&&seq.every(x=>x===-1))add('Três derrotas seguidas',-1.5);
  const pos=table(divOf(uc)).findIndex(x=>x.id===me)+1;
  add(`Posição (${pos}º) contra a meta (${t.meta.alvo}º)`,clamp((t.meta.alvo-pos)*0.3,-2,2)*Math.min(1,S.round/8)); // pesa pouco nas primeiras rodadas
  // shortcut: finanças = só caixa negativo, sem comparar a folha com a receita; ampliar se a diretoria precisar cobrar gasto alto
  if(uc.balance<0)add('Caixa negativo',-1.5);
  aplicarConfianca(t,fat,6);
}
export function aplicarConfianca(t,fat,lim){
  const d=clamp(fat.reduce((s,f)=>s+f.v,0),-lim,lim);
  t.conf=clamp(Math.round((t.conf+d)*10)/10,0,100);t.confFat=fat;
  t.confBaixa=t.conf<=DEMISSAO_NIVEL?(t.confBaixa||0)+1:0;
  if(t.confBaixa>=DEMISSAO_RODADAS&&!t.demitido){t.demitido=true;addNews('🔥 A diretoria demitiu você.',t.clubId)}
}
export function confiancaFimTemporada(t,pos){
  const dif=t.meta.alvo-pos,ok=dif>=0;
  aplicarConfianca(t,[{t:`Fim de temporada: ${pos}º (meta: ${t.meta.texto})`,v:ok?Math.min(15,5+dif*2):Math.max(-20,dif*3)}],20);
}
// confiança volta a meia distância do neutro a cada temporada
export function confiancaNovaTemporada(t){t.conf=Math.round((t.conf+CONF_INICIO)/2);t.confBaixa=0;definirMeta(t);addNews(`🎯 Meta da diretoria: ${t.meta.texto}.`,t.clubId)}
