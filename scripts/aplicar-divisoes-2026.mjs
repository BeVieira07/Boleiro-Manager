// Redistribui os clubes de data/brasileirao*.json entre as séries conforme data/divisoes-2026.json.
// Uso: node scripts/aplicar-divisoes-2026.mjs  e depois  npm run dados:padrao
import { readFileSync, writeFileSync } from 'node:fs';
const arq = { A: 'data/brasileirao-2024.json', B: 'data/brasileirao-serie-b-2024.json', C: 'data/brasileirao-serie-c-2024.json', D: 'data/brasileirao-serie-d-2024.json' };
const dados = Object.fromEntries(Object.entries(arq).map(([d, f]) => [d, JSON.parse(readFileSync(f, 'utf8'))]));
const todos = new Map(Object.values(dados).flatMap(d => d.clubs).map(c => [c.id, c]));
const alvo = JSON.parse(readFileSync('data/divisoes-2026.json', 'utf8'));
const usados = new Set();
for (const d of Object.keys(arq)) {
  for (const id of alvo[d]) { if (!todos.has(id)) throw new Error(`Clube ${id} não existe nos dados`); if (usados.has(id)) throw new Error(`Clube ${id} repetido`); usados.add(id); }
  if (alvo[d].length !== 20) throw new Error(`Série ${d} com ${alvo[d].length} clubes`);
  dados[d].clubs = alvo[d].map(id => Object.assign(todos.get(id), { division: d }));
  writeFileSync(arq[d], JSON.stringify(dados[d], null, 2));
}
const sobra = [...todos.keys()].filter(id => !usados.has(id));
console.log(`OK. Fora das séries: ${sobra.map(id => todos.get(id).name).join(', ') || 'nenhum'}`);
