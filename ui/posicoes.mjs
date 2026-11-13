import { POSD, atributosDe, posDNome, posDSigla } from '../core/posicoes.mjs';

// Etiqueta da posição para as tabelas: sigla detalhada, com nome, secundárias e atributos-chave na dica.
export function posTag(p){
  const sec=(p.ps||[]).map(k=>POSD[k].nome).join(', ');
  const at=atributosDe(p).slice(0,4).map(a=>`${a.nome} ${a.v}`).join(' · ');
  return `<span class="pos ${p.pos}" title="${posDNome(p)}${sec?' (também: '+sec+')':''} — ${at}">${posDSigla(p)}</span>`;
}
