// seta de tendência para o elenco: variação desde o início da temporada
export function tendenciaTag(p){const d=p.ovr-(p.o0??p.ovr);return d>0?`<span class="ok">▲ +${d}</span>`:d<0?`<span class="bad">▼ ${d}</span>`:'<span class="muted">—</span>'}
