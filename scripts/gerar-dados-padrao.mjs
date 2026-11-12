// Gera js/dados-padrao.js (dados embutidos no jogo) a partir dos JSONs em data/.
// Uso: npm run dados:padrao
// Junta a Série A (data/brasileirao-<ano>.json) com a Série B (data/brasileirao-serie-b-<ano>.json), se existir.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ANO = process.argv[2] || '2024';
const ler = f => JSON.parse(readFileSync(f, 'utf8'));
const a = ler(`data/brasileirao-${ANO}.json`);
const fb = `data/brasileirao-serie-b-${ANO}.json`;
const b = existsSync(fb) ? ler(fb) : { clubs: [] };
a.clubs.forEach(c => c.division = 'A');
b.clubs.forEach(c => c.division = 'B');
const clubs = [...a.clubs, ...b.clubs];

// conferências: siglas e ids de jogador não podem repetir
const siglas = clubs.map(c => c.short), rep = siglas.filter((s, i) => siglas.indexOf(s) !== i);
if (rep.length) throw new Error('Siglas repetidas: ' + rep.join(', '));
const ids = new Set();
for (const c of clubs) for (const p of c.players) { if (ids.has(p.id)) throw new Error(`Jogador repetido: ${p.name} (${c.name})`); ids.add(p.id); }

const data = { source: 'api', season: a.season, createdAt: a.createdAt, clubs };
writeFileSync('js/dados-padrao.js', `// Dados padrão do jogo (API-Football), temporada ${a.season}. NÃO EDITE: gerado por scripts/gerar-dados-padrao.mjs a partir de data/.\nconst DADOS_PADRAO=${JSON.stringify(data)};\n`);
console.log(`js/dados-padrao.js: Série A ${a.clubs.length} clubes + Série B ${b.clubs.length} clubes, ${ids.size} jogadores.`);
