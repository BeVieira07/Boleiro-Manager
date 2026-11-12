/* ================= utilidades ================= */
const SAVE_KEY='brasfoot_save_v1', DATA_KEY='brasfoot_data_v1', APIKEY_KEY='brasfoot_apikey';
const store={
  get(k){try{return JSON.parse(localStorage.getItem(k))}catch(e){return null}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function hashStr(s){let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
// Sorteio com semente (#26): as regras usam rnd(), que avança S.rng (estado do gerador mulberry32 guardado no jogo).
// Mesmo estado + mesmas entradas = mesmo resultado. Cada rodada recomeça de semente(S.seed, temporada, rodada).
// Sem jogo carregado (S nulo) cai no Math.random, que só serve para coisas fora das regras.
function rnd(){
  if(typeof S==='undefined'||!S||S.rng==null)return Math.random();
  const a=S.rng=(S.rng+0x6D2B79F5)|0;
  let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;
  return((t^t>>>14)>>>0)/4294967296;
}
const semente=(...partes)=>hashStr(partes.join('|'))|0;
const novaSemente=()=>(Math.random()*4294967296)|0; // único uso de Math.random ligado às regras: a semente de uma campanha nova
const ri=(a,b,r=rnd)=>a+Math.floor(r()*(b-a+1));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const pick=(arr,r=rnd)=>arr[Math.floor(r()*arr.length)];
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(s){return String(s).normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase()}
function money(m){const neg=m<0;m=Math.abs(m);const s=m>=1?'R$ '+m.toFixed(1).replace('.',',')+' mi':'R$ '+Math.round(m*1000)+' mil';return (neg?'-':'')+s}
function poisson(l){const L=Math.exp(-l);let k=0,p=1;do{k++;p*=rnd()}while(p>L);return k-1}
const PORD={G:0,D:1,M:2,A:3};
const FORMS={'4-4-2':[4,4,2],'4-3-3':[4,3,3],'3-5-2':[3,5,2],'4-5-1':[4,5,1],'5-3-2':[5,3,2],'3-4-3':[3,4,3]};

