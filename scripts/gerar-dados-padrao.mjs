// Gera js/dados-padrao.js (dados embutidos no jogo) a partir dos JSONs em data/.
// Uso: npm run dados:padrao
// Junta a Série A (data/brasileirao-<ano>.json) com as Séries B, C e D (data/brasileirao-serie-<b|c|d>-<ano>.json), se existirem.
// Aplica também o overall real dos jogadores:
//   1. data/notas-<ano>.json (npm run notas): nota média e minutos -> p.base (overall calculado) e p.conf (confiança)
//   2. data/overalls-manual.json: overall escolhido à mão para os craques -> p.ovrM (vale mais que tudo)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ANO = process.argv[2] || '2024';
const ler = f => JSON.parse(readFileSync(f, 'utf8'));
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const a = ler(`data/brasileirao-${ANO}.json`);
const series = { A: a };
for (const x of ['b', 'c', 'd']) { const f = `data/brasileirao-serie-${x}-${ANO}.json`; if (existsSync(f)) series[x.toUpperCase()] = ler(f); }
const clubs = [];
for (const [div, d] of Object.entries(series)) { d.clubs.forEach(c => c.division = div); clubs.push(...d.clubs); }

// conferências: siglas e ids de jogador não podem repetir
const siglas = clubs.map(c => c.short), rep = siglas.filter((s, i) => siglas.indexOf(s) !== i);
if (rep.length) throw new Error('Siglas repetidas: ' + rep.join(', '));
const ids = new Set();
for (const c of clubs) for (const p of c.players) { if (ids.has(p.id)) throw new Error(`Jogador repetido: ${p.name} (${c.name})`); ids.add(p.id); }

/* ================= 1. notas reais (API-Football) ================= */
// Overall médio e desvio de quem tem nota em cada série (a mesma nota vale mais na Série A que na C).
// Mantenha CENTRO igual ao OVR_CENTRO de js/dados.js.
const CENTRO = { A: 72, B: 66, C: 61, D: 56 }, DP = 4.5, MIN_AMOSTRA = 600, MIN_GRUPO = 12;
const PESO_GA = { A: 0.3, M: 0.15, D: 0, G: 0 }; // quanto gols+assistências por 90 min pesam além da nota
const fn = `data/notas-${ANO}.json`;
const notas = existsSync(fn) ? ler(fn) : null;
let comNota = 0, comBase = 0;
if (notas) {
  const media = v => v.reduce((s, x) => s + x, 0) / v.length;
  const dp = v => { const m = media(v); return Math.sqrt(media(v.map(x => (x - m) ** 2))) || 1; };
  const grupos = {};
  for (const j of Object.values(notas.jogadores))
    for (const [L, e] of Object.entries(j.L))
      if (e.m >= MIN_AMOSTRA && e.r && j.p) (grupos[`${L}|${j.p}`] ||= []).push({ r: e.r, g: (e.g + 0.7 * e.s) / e.m * 90 });
  const estat = v => ({ mr: media(v.map(x => x.r)), sr: dp(v.map(x => x.r)), mg: media(v.map(x => x.g)), sg: dp(v.map(x => x.g)) });
  const ref = {}; // média e desvio da nota e da produção por (série, posição); grupos pequenos (ex.: goleiros) usam a série inteira
  for (const L of Object.keys(CENTRO)) {
    const todos = Object.entries(grupos).filter(([k]) => k.startsWith(L + '|')).flatMap(([, v]) => v);
    if (todos.length >= MIN_GRUPO) ref[L] = estat(todos);
  }
  for (const [k, v] of Object.entries(grupos)) ref[k] = v.length >= MIN_GRUPO ? estat(v) : ref[k.split('|')[0]];

  // as notas estão completas quando todos os clubes das Séries A, B e C foram baixados
  const abc = clubs.filter(c => 'ABC'.includes(c.division));
  const completo = abc.every(c => notas.times[c.id.replace(/^c/, '')]?.ok);
  for (const c of clubs) for (const p of c.players) {
    const j = notas.jogadores[p.id.replace(/^p/, '')];
    if (!j) { if (completo && 'ABC'.includes(c.division)) p.mn = 0; continue; } // sem nenhum minuto nas séries A–C em 2024
    let M = 0, soma = 0;
    for (const [L, e] of Object.entries(j.L)) {
      M += e.m; const r = ref[`${L}|${j.p}`];
      if (!r || !e.r || e.m < 90) continue;
      const w = PESO_GA[j.p] ?? 0;
      const z = clamp((1 - w) * (e.r - r.mr) / r.sr + w * ((e.g + 0.7 * e.s) / e.m * 90 - r.mg) / r.sg, -2.5, 2.5);
      soma += e.m * (CENTRO[L] + z * DP);
    }
    p.mn = M; comNota++;
    const conf = clamp((M - 400) / 1600, 0, 1); // 400 min = 0, 2000+ min (uns 22 jogos) = confiança total
    if (soma && conf > 0) { p.base = Math.round(soma / M * 10) / 10; p.conf = Math.round(conf * 100) / 100; comBase++; }
  }
  console.log(`Notas: ${Object.values(notas.times).filter(t => t.ok).length} clubes baixados${completo ? ' (completo)' : ' (parcial)'}; ${comNota} jogadores com minutos, ${comBase} com overall calculado.`);
} else console.log('Sem data/notas-' + ANO + '.json: rode npm run notas para calibrar o overall com notas reais.');

/* ================= 2. overalls manuais ================= */
const mf = 'data/overalls-manual.json';
let manual = 0;
if (existsSync(mf)) {
  for (const [clube, jogs] of Object.entries(ler(mf))) {
    if (clube.startsWith('_')) continue;
    const c = clubs.find(c => norm(c.name) === norm(clube));
    if (!c) { console.log(`Manual: clube "${clube}" não encontrado.`); continue; }
    for (const [nome, ovr] of Object.entries(jogs)) {
      const toks = norm(nome).split(' ');
      const acha = lista => { // todas as palavras do nome precisam aparecer no jogador; nome igual tem prioridade
        const exato = lista.filter(p => norm(p.name) === norm(nome));
        return exato.length ? exato : lista.filter(p => toks.every(t => norm(p.name).split(' ').includes(t)));
      };
      let r = acha(c.players);
      if (!r.length) r = acha(clubs.flatMap(x => x.players)); // se mudou de clube nos dados
      if (r.length !== 1) { console.log(`Manual: "${nome}" (${clube}) ${r.length ? 'ambíguo: ' + r.map(p => p.name).join(' / ') : 'não encontrado'}.`); continue; }
      r[0].ovrM = ovr; manual++;
    }
  }
  console.log(`Manual: ${manual} overalls ajustados à mão.`);
}

/* ================= 3. escudos locais ================= */
// Se img/escudos/<id>.png existe (npm run escudos), o jogo usa o arquivo em vez do link da API.
let locais = 0;
for (const c of clubs) if (existsSync(`img/escudos/${c.id}.png`)) { c.logo = `img/escudos/${c.id}.png`; locais++; }
console.log(`Escudos: ${locais}/${clubs.length} usando arquivo local.`);

/* ================= 4. posições detalhadas ================= */
// Usa a mesma lógica do jogo (js/posicoes.js): a API só traz goleiro/defensor/meia/atacante, então a posição detalhada vem da camisa e do equilíbrio do elenco.
const hashStr = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 };
const { atribuirPosicoes } = new Function('hashStr', 'clamp', readFileSync('js/posicoes.js', 'utf8') + '\nreturn { atribuirPosicoes };')(hashStr, clamp);
for (const c of clubs) atribuirPosicoes(c.players);
console.log(`Posições: ${clubs.reduce((s, c) => s + c.players.filter(p => p.pd).length, 0)}/${ids.size} jogadores com posição detalhada.`);

const data = { source: 'api', season: a.season, createdAt: a.createdAt, clubs };
writeFileSync('js/dados-padrao.js', `// Dados padrão do jogo (API-Football), temporada ${a.season}. NÃO EDITE: gerado por scripts/gerar-dados-padrao.mjs a partir de data/.\nconst DADOS_PADRAO=${JSON.stringify(data)};\n`);
console.log(`js/dados-padrao.js: ${Object.entries(series).map(([d, x]) => `Série ${d} ${x.clubs.length} clubes`).join(' + ')}, ${ids.size} jogadores.`);
