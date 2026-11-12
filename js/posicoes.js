/* ================= posições detalhadas =================
   p.pos  = grupo (G/D/M/A), mantido para o motor e para saves antigos
   p.pd   = posição principal detalhada (chave de POSD)
   p.ps   = posições secundárias (lista de chaves de POSD), opcional
   Carregado depois de utils.js e antes de dados.js; também é lido por scripts/gerar-dados-padrao.mjs. */
const POSD={
  GOL:{nome:'Goleiro',grupo:'G'},
  ZAG:{nome:'Zagueiro',grupo:'D'},
  LD:{nome:'Lateral direito',grupo:'D'},
  LE:{nome:'Lateral esquerdo',grupo:'D'},
  VOL:{nome:'Volante',grupo:'M'},
  MC:{nome:'Meia central',grupo:'M'},
  MEI:{nome:'Meia-atacante',grupo:'M'},
  PE:{nome:'Ponta esquerda',grupo:'A'},
  PD:{nome:'Ponta direita',grupo:'A'},
  ATA:{nome:'Centroavante',grupo:'A'}
};
const POSD_ORDEM=Object.keys(POSD);
const GRUPO_DETALHES={G:['GOL'],D:['ZAG','LD','LE'],M:['VOL','MC','MEI'],A:['PE','PD','ATA']};
// proporção aproximada de cada posição dentro do grupo, no elenco
const POSD_PESO={GOL:1,ZAG:.5,LD:.25,LE:.25,VOL:.4,MC:.35,MEI:.25,PE:.25,PD:.25,ATA:.5};
// dica pelo número da camisa (quando a API não traz a posição detalhada)
const POSD_CAMISA={2:'LD',13:'LD',23:'LD',6:'LE',16:'LE',26:'LE',3:'ZAG',4:'ZAG',14:'ZAG',15:'ZAG',5:'VOL',8:'MC',10:'MEI',7:'PD',11:'PE',9:'ATA',19:'ATA'};

// Atributos que importam em cada posição (peso 0-1). O jogo mostra os mais relevantes.
const ATRIBUTOS={vel:'Velocidade',cruz:'Cruzamento',marc:'Marcação',aereo:'Jogo aéreo',passe:'Passe',drible:'Drible',fin:'Finalização',visao:'Visão de jogo',fisico:'Físico',refl:'Reflexo',jogoPes:'Jogo com os pés'};
const POSD_ATRIB={
  GOL:{refl:1,aereo:.7,jogoPes:.5,fisico:.3},
  ZAG:{marc:1,aereo:1,fisico:.7,passe:.3},
  LD:{vel:1,cruz:1,marc:.6,fisico:.4},
  LE:{vel:1,cruz:1,marc:.6,fisico:.4},
  VOL:{marc:1,passe:.8,fisico:.7,visao:.4},
  MC:{passe:1,visao:1,drible:.6,fin:.3},
  MEI:{visao:1,drible:.9,fin:.7,passe:.7},
  PE:{vel:1,drible:1,cruz:.7,fin:.5},
  PD:{vel:1,drible:1,cruz:.7,fin:.5},
  ATA:{fin:1,aereo:.8,fisico:.6,drible:.3}
};
// Valor de um atributo: o overall mais um desvio estável (derivado do id, sem sorteio novo a cada abertura).
function atributosDe(p){
  const peso=POSD_ATRIB[p.pd||'MC'];
  return Object.entries(peso).map(([k,w])=>{
    const ruido=(hashStr(p.id+'|'+k)%9)-4;
    return {k,nome:ATRIBUTOS[k],v:clamp(Math.round(p.ovr+(w-.6)*8+ruido),20,99),w};
  }).sort((a,b)=>b.w-a.w);
}

// Perda de rendimento (fração do overall) de quem joga em outra posição: PEN[principal][posição jogada].
const PEN={
  GOL:{},
  ZAG:{LD:.12,LE:.12,VOL:.10,MC:.22,MEI:.30,PE:.32,PD:.32,ATA:.35},
  LD:{LE:.08,ZAG:.12,VOL:.15,PD:.15,PE:.17,MC:.20,MEI:.22,ATA:.30},
  LE:{LD:.08,ZAG:.12,VOL:.15,PE:.15,PD:.17,MC:.20,MEI:.22,ATA:.30},
  VOL:{ZAG:.10,MC:.08,LD:.15,LE:.15,MEI:.15,PE:.22,PD:.22,ATA:.28},
  MC:{VOL:.08,MEI:.06,PE:.12,PD:.12,LD:.18,LE:.18,ZAG:.20,ATA:.18},
  MEI:{MC:.06,PE:.08,PD:.08,ATA:.10,VOL:.14,LD:.18,LE:.18,ZAG:.28},
  PE:{PD:.08,MEI:.08,ATA:.10,MC:.12,LE:.15,LD:.17,VOL:.20,ZAG:.30},
  PD:{PE:.08,MEI:.08,ATA:.10,MC:.12,LD:.15,LE:.17,VOL:.20,ZAG:.30},
  ATA:{PE:.10,PD:.10,MEI:.10,MC:.18,VOL:.26,LD:.28,LE:.28,ZAG:.32}
};
const PEN_SECUNDARIA=0.03, PEN_GOLEIRO=0.6; // goleiro na linha (ou o contrário) é quase inútil
/* Penalidade de escalar o jogador p na posição `slot` (chave de POSD).
   Retorna {pen, tipo, aviso}: pen é a fração perdida (0 a 0.6); tipo é 'principal', 'secundaria' ou 'fora';
   aviso é um texto para mostrar ao usuário (null quando está na posição ou numa secundária). */
function penalidadePosicao(p,slot){
  const pd=p.pd||inferirPosicao(p);
  if(pd===slot)return {pen:0,tipo:'principal',aviso:null};
  if((p.ps||[]).includes(slot))return {pen:PEN_SECUNDARIA,tipo:'secundaria',aviso:null};
  const pen=(pd==='GOL'||slot==='GOL')?PEN_GOLEIRO:(PEN[pd]&&PEN[pd][slot])||.35;
  return {pen,tipo:'fora',aviso:`${p.name} é ${POSD[pd].nome.toLowerCase()} e jogará de ${POSD[slot].nome.toLowerCase()}: -${Math.round(pen*100)}% no desempenho.`};
}
// Overall do jogador já com a penalidade da posição em que joga.
function ovrNaPosicao(p,slot){return Math.round(p.ovr*(1-penalidadePosicao(p,slot).pen))}
const posDNome=p=>POSD[p.pd||inferirPosicao(p)].nome;
const posDSigla=p=>p.pd||inferirPosicao(p);

/* ---- atribuição e migração ---- */
function inferirPosicao(p){ // sem contexto do elenco: só pelo grupo e pela camisa
  const g=GRUPO_DETALHES[p.pos]||['MC'],h=POSD_CAMISA[p.number];
  return h&&g.includes(h)?h:g[hashStr(p.id)%g.length];
}
function sorteiaSecundarias(p){
  const afins=Object.entries(PEN[p.pd]||{}).filter(([,v])=>v<=.12).map(([k])=>k);
  const h=hashStr(p.id+'|sec');
  return afins.length&&h%5<2?[afins[h%afins.length]]:[];
}
// Dá pd/ps a quem ainda não tem, equilibrando o elenco (proporção de POSD_PESO). Idempotente: não mexe em quem já tem pd.
function atribuirPosicoes(players){
  const cont={},tam={};
  for(const p of players){tam[p.pos]=(tam[p.pos]||0)+1;if(p.pd)cont[p.pd]=(cont[p.pd]||0)+1}
  for(const p of players){
    if(p.pd&&POSD[p.pd]){if(!p.ps)p.ps=sorteiaSecundarias(p);continue}
    const g=GRUPO_DETALHES[p.pos]||['MC'],soma=g.reduce((s,k)=>s+POSD_PESO[k],0);
    let pd=POSD_CAMISA[p.number];
    // a dica da camisa vale até a cota da posição no elenco (+1)
    if(!pd||!g.includes(pd)||(cont[pd]||0)>=Math.ceil(tam[p.pos]*POSD_PESO[pd]/soma)+1)
      pd=[...g].sort((a,b)=>(cont[a]||0)/POSD_PESO[a]-(cont[b]||0)/POSD_PESO[b])[0];
    p.pd=pd;cont[pd]=(cont[pd]||0)+1;p.ps=sorteiaSecundarias(p);
  }
}
// Sorteio para jogadores gerados (base, elenco fictício): escolhe a posição detalhada de um grupo.
function sorteiaPosD(grupo,r){
  const g=GRUPO_DETALHES[grupo]||['MC'];let x=r()*g.reduce((s,k)=>s+POSD_PESO[k],0);
  for(const k of g){x-=POSD_PESO[k];if(x<=0)return k}return g[0];
}
// Chaves da #23: MEI→MC, MAT→MEI, CEN→ATA, PON→PE ou PD (pela camisa 11/7, senão pelo id). A ordem importa: MEI vira MC antes de MAT virar MEI.
function converterPosicoesAntigas(players){
  const ponta=p=>p.number===11?'PE':p.number===7?'PD':hashStr(p.id)%2?'PE':'PD';
  for(const p of players){
    const nova=k=>k==='PON'?ponta(p):k==='MEI'?'MC':k==='MAT'?'MEI':k==='CEN'?'ATA':k;
    if(p.pd)p.pd=nova(p.pd);
    if(p.ps)p.ps=[...new Set(p.ps.map(nova))].filter(k=>k!==p.pd);
  }
}
// estado.posv=2 marca saves já convertidos
function migrarPosicoes(estado){
  if(estado.posv!==2){for(const c of estado.clubs)converterPosicoesAntigas(c.players);estado.posv=2}
  for(const c of estado.clubs)atribuirPosicoes(c.players);
}

// Etiqueta da posição para as tabelas: sigla detalhada, com nome, secundárias e atributos-chave na dica.
function posTag(p){
  const sec=(p.ps||[]).map(k=>POSD[k].nome).join(', ');
  const at=atributosDe(p).slice(0,4).map(a=>`${a.nome} ${a.v}`).join(' · ');
  return `<span class="pos ${p.pos}" title="${posDNome(p)}${sec?' (também: '+sec+')':''} — ${at}">${posDSigla(p)}</span>`;
}
