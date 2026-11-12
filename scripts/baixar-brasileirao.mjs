// Baixa os dados da Série A, B, C ou D (API-Football) e salva em JSON.
// Uso: npm run dados                 Série A (lê API_FOOTBALL_KEY do arquivo .env)
//      npm run dados:b               Série B 2024
//      npm run dados:c               Série C 2024
//      npm run dados:d               Série D 2024 (só os 20 clubes que foram mais longe)
//  ou: node scripts/baixar-brasileirao.mjs [SUA_CHAVE] [--temporada=2024] [--serie=b|c|d]
// Gera: brasileirao-<temporada>.json (Série A) ou brasileirao-serie-<b|c|d>-<temporada>.json (Séries B, C e D)
//       -> formato do jogo (use "Carregar JSON" na tela Dados; o jogo oferece juntar com a outra série)
//       ...-raw.json -> respostas brutas da API, para usar no seu próprio código
import { writeFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2), flag = n => (args.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const pos = args.filter(a => !a.startsWith('--'));
const KEY = pos[0] || process.env.API_FOOTBALL_KEY;
const LEAGUES = { A: 71, B: 72, C: 75, D: 76 };
const SERIE = (flag('serie') || process.env.API_FOOTBALL_SERIE || 'a').toUpperCase();
if (!LEAGUES[SERIE]) { console.error('Série inválida: use a, b, c ou d.'); process.exit(1); }
const LEAGUE = LEAGUES[SERIE];
const SEASON = parseInt(flag('temporada') || pos[1] || process.env.API_FOOTBALL_SEASON || '2026', 10);
const DELAY = 7000; // plano gratuito: 10 requisições/minuto
if (!KEY) { console.error('Uso: node baixar-brasileirao.mjs SUA_CHAVE [--temporada=2024] [--serie=b]  (ou coloque API_FOOTBALL_KEY no .env)'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function api(path) {
  const res = await fetch('https://v3.football.api-sports.io' + path, { headers: { 'x-apisports-key': KEY } });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const errs = Array.isArray(j.errors) ? j.errors : Object.values(j.errors || {});
  if (errs.length) throw new Error(errs.join(' | '));
  return j;
}

const STRENGTH = { flamengo: 80, palmeiras: 79, botafogo: 75, cruzeiro: 75, 'atletico-mg': 74, fluminense: 74, internacional: 73,
  'sao paulo': 73, corinthians: 73, bahia: 72, gremio: 72, vasco: 71, bragantino: 71, santos: 71, paranaense: 69, mirassol: 69,
  vitoria: 68, coritiba: 67, chapecoense: 65, remo: 65 };
const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// clubes homônimos de outros estados (ex.: Botafogo SP/PB) não herdam a força do clube da Série A
const homonimo = n => /botafogo.*(sp|pb)/.test(n);
const baseStrength = name => { const n = norm(name); if (homonimo(n)) return 68; for (const k in STRENGTH) if (n.includes(k)) return STRENGTH[k]; return 68; };
const POS = { Goalkeeper: 'G', Defender: 'D', Midfielder: 'M', Attacker: 'A' };

// [nome, chaves de busca] dos 20 clubes da Série A 2026
const CLUBS_2026 = [['Flamengo',['flamengo']],['Palmeiras',['palmeiras']],['Botafogo',['botafogo']],['Cruzeiro',['cruzeiro']],
  ['Atlético-MG',['atletico-mg','atletico mineiro']],['Fluminense',['fluminense']],['Internacional',['internacional']],['São Paulo',['sao paulo']],
  ['Corinthians',['corinthians']],['Bahia',['bahia']],['Grêmio',['gremio']],['Vasco da Gama',['vasco']],['RB Bragantino',['bragantino']],
  ['Santos',['santos']],['Athletico-PR',['paranaense','athletico']],['Mirassol',['mirassol']],['Vitória',['vitoria']],['Coritiba',['coritiba']],
  ['Chapecoense',['chapecoense']],['Remo',['remo']]];
const raw = { season: SEASON, mode: null, teams: [], standings: null, squads: {} };
const rank = {};
let list = null; // [{ t: time da API, name }]
try {
  console.log(`Times da Série ${SERIE} ${SEASON}...`);
  const j = await api(`/teams?league=${LEAGUE}&season=${SEASON}`);
  if (j.results > 0) { raw.mode = 'season'; raw.teams = j.response; list = j.response.map(x => ({ t: x.team, name: x.team.name })); }
} catch (e) { console.log(`  ${SEASON}: ${e.message}`); }

if (list) {
  try {
    await sleep(DELAY);
    const st = await api(`/standings?league=${LEAGUE}&season=${SEASON}`);
    raw.standings = st.response;
    (st.response?.[0]?.league?.standings?.[0] || []).forEach(r => rank[r.team.id] = r.rank);
  } catch (e) { console.log('Classificação indisponível: ' + e.message); }
  if (SERIE === 'D') { // 64 clubes em grupos: fica com os 20 que foram mais longe (quem avança joga mais; desempate pelos pontos na 1ª fase)
    const pts = {}, ko = {};
    for (const g of raw.standings?.[0]?.league?.standings || []) for (const r of g) pts[r.team.id] = r.points;
    try {
      await sleep(DELAY);
      const fx = await api(`/fixtures?league=${LEAGUE}&season=${SEASON}`);
      raw.fixtures = fx.response;
      for (const f of fx.response) for (const id of [f.teams.home.id, f.teams.away.id]) ko[id] = (ko[id] || 0) + 1;
    } catch (e) { console.log('Jogos indisponíveis: ' + e.message); }
    const score = id => (ko[id] || 0) * 1000 + (pts[id] || 0);
    list = list.sort((a, b) => score(b.t.id) - score(a.t.id)).slice(0, 20);
    for (const k in rank) delete rank[k];
    list.forEach((x, i) => rank[x.t.id] = i + 1);
    console.log('Série D, os 20 que foram mais longe: ' + list.map(x => `${x.name} (${ko[x.t.id] || 0} jogos)`).join(', '));
  }
} else if (SERIE !== 'A') {
  console.error(`Seu plano não libera a Série ${SERIE} ${SEASON}. Use --temporada=2024 (no plano gratuito vale de 2022 a 2024).`);
  process.exit(1);
} else {
  console.log('Plano não libera essa temporada -> montando os 20 clubes de 2026 com os elencos atuais.');
  raw.mode = 'current-squads';
  let known = [];
  for (const s of [2024, 2023, 2022]) {
    await sleep(DELAY);
    try { const j = await api(`/teams?league=${LEAGUE}&season=${s}`); known = j.response.map(x => x.team); console.log(`IDs obtidos da temporada ${s}.`); break; }
    catch (e) { console.log(`  ${s}: ${e.message}`); }
  }
  const match = (t, keys) => keys.some(k => norm(t.name).includes(k));
  list = [];
  for (const [name, keys] of CLUBS_2026) {
    let t = known.find(t => match(t, keys));
    if (!t) {
      await sleep(DELAY);
      const q = keys[0].includes('-') ? norm(name) : keys[0];
      try {
        const j = await api(`/teams?search=${encodeURIComponent(q)}&country=Brazil`);
        t = (j.response || []).map(x => x.team).filter(t => match(t, keys)).sort((a, b) => a.name.length - b.name.length)[0];
        console.log(`Busca "${name}": ${t ? t.name + ' (id ' + t.id + ')' : 'não encontrado'}`);
      } catch (e) { console.log(`Busca "${name}": ${e.message}`); }
    }
    if (t) raw.teams.push({ team: t });
    list.push({ t: t || null, name });
  }
}

const clubs = [];
for (const [i, { t, name }] of list.entries()) {
  let players = [];
  if (t) {
    await sleep(DELAY);
    try {
      const j = await api(`/players/squads?team=${t.id}`);
      raw.squads[t.id] = j.response;
      players = (j.response?.[0]?.players || []).filter(p => POS[p.position])
        .map(p => ({ id: 'p' + p.id, name: p.name, age: p.age || 24, pos: POS[p.position], number: p.number, photo: p.photo }));
    } catch (e) { console.log(`  erro no elenco: ${e.message}`); }
  }
  // força base por série: B = 64 (ou a da Série A menos 4 para clubes conhecidos), C = 59 (ou menos 9), D = 55 (ou menos 13)
  const known = !homonimo(norm(name)) && Object.keys(STRENGTH).some(k => norm(name).includes(k));
  const DROP = { A: 0, B: 4, C: 9, D: 13 }, BASE = { A: 68, B: 64, C: 59, D: 55 }, TOP = { A: 80, B: 70, C: 64, D: 59 }, STEP = { A: 0.8, B: 0.5, C: 0.4, D: 0.3 };
  let strength = SERIE === 'A' ? baseStrength(name) : known ? baseStrength(name) - DROP[SERIE] : BASE[SERIE];
  const fromRank = r => TOP[SERIE] - (r - 1) * STEP[SERIE];
  if (t && rank[t.id] && Object.keys(rank).length >= 10) strength = Math.round((strength + fromRank(rank[t.id])) / 2);
  clubs.push({ id: 'c' + (t ? t.id : i), name, short: ((t && t.code) || name.slice(0, 3)).toUpperCase(), color: '#335', logo: t ? t.logo : null, strength, division: SERIE, players });
  console.log(`(${i + 1}/${list.length}) ${name}: ${players.length} jogadores`);
}
const season = SEASON;

const data = { source: 'api', season, createdAt: new Date().toISOString(), clubs };
mkdirSync('data', { recursive: true });
const base = `data/brasileirao-${SERIE === 'A' ? '' : 'serie-' + SERIE.toLowerCase() + '-'}${season}`;
writeFileSync(`${base}.json`, JSON.stringify(data, null, 2));
writeFileSync(`${base}-raw.json`, JSON.stringify(raw, null, 2));
console.log(`\nPronto! ${base}.json e ${base}-raw.json salvos.`);
