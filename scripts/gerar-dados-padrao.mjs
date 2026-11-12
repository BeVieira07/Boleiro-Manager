// Gera js/dados-padrao.js (dados embutidos no jogo) a partir dos JSONs em data/.
// Uso: npm run dados:padrao
// Junta a Série A (data/brasileirao-<ano>.json) com as Séries B e C (data/brasileirao-serie-<b|c>-<ano>.json), se existirem.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ANO = process.argv[2] || '2024';
const ler = f => JSON.parse(readFileSync(f, 'utf8'));
const a = ler(`data/brasileirao-${ANO}.json`);
const series = { A: a };
for (const x of ['b', 'c']) { const f = `data/brasileirao-serie-${x}-${ANO}.json`; if (existsSync(f)) series[x.toUpperCase()] = ler(f); }
const clubs = [];
for (const [div, d] of Object.entries(series)) { d.clubs.forEach(c => c.division = div); clubs.push(...d.clubs); }

// conferências: siglas e ids de jogador não podem repetir
const siglas = clubs.map(c => c.short), rep = siglas.filter((s, i) => siglas.indexOf(s) !== i);
if (rep.length) throw new Error('Siglas repetidas: ' + rep.join(', '));
const ids = new Set();
for (const c of clubs) for (const p of c.players) { if (ids.has(p.id)) throw new Error(`Jogador repetido: ${p.name} (${c.name})`); ids.add(p.id); }

const data = { source: 'api', season: a.season, createdAt: a.createdAt, clubs };
writeFileSync('js/dados-padrao.js', `// Dados padrão do jogo (API-Football), temporada ${a.season}. NÃO EDITE: gerado por scripts/gerar-dados-padrao.mjs a partir de data/.\nconst DADOS_PADRAO=${JSON.stringify(data)};\n`);
console.log(`js/dados-padrao.js: ${Object.entries(series).map(([d, x]) => `Série ${d} ${x.clubs.length} clubes`).join(' + ')}, ${ids.size} jogadores.`);
