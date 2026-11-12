// Carrega o jogo inteiro em Node, sem navegador, para os testes.
// Os scripts de js/ são carregados na ordem do index.html, num contexto isolado com um DOM falso mínimo:
// - o HTML de cada tela vai para `ctx.html()` (o que seria o innerHTML de #app);
// - alert/confirm são registrados em `ctx.alertas` e confirm sempre responde "sim";
// - localStorage é um objeto em memória (`ctx.ls`), com limite configurável para simular falta de espaço.
// Quando o motor for separado da tela (#27), os testes passam a importar o core/ direto.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const RAIZ = new URL('..', import.meta.url);
const ler = f => readFileSync(new URL(f, RAIZ), 'utf8');
const SCRIPTS = [...ler('index.html').matchAll(/src="(js\/[^"]+)"/g)].map(m => m[1]);
const FONTES = Object.fromEntries(SCRIPTS.map(s => [s, ler(s)]));

// elemento falso: aceita qualquer leitura, escrita e chamada
const falso = () => new Proxy(function () {}, {
  get: (t, k) => k === 'value' ? '5' : k === 'checked' ? false : k === Symbol.toPrimitive ? () => '' : falso(),
  set: () => true, apply: () => falso()
});

/** Cria um jogo novo em memória. `boot: true` roda também o main.js (abertura do jogo). */
export function carregarJogo({ boot = false, ls = {}, limiteLs = Infinity } = {}) {
  let app = '';
  const alertas = [];
  const appEl = new Proxy({}, { set: (t, k, v) => { if (k === 'innerHTML') app = v; return true }, get: () => falso() });
  const ctx = {
    console, Math, JSON, Object, Array, Date, Number, String, Boolean, RegExp, Error, parseInt, parseFloat, isNaN, isFinite, Set, Map, Promise, URL, Blob: function () {},
    setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {},
    document: { getElementById: id => id === 'app' ? appEl : falso(), querySelector: () => falso(), querySelectorAll: () => [], createElement: () => falso(), body: falso(), addEventListener() {} },
    window: { scrollTo() {}, addEventListener() {} },
    localStorage: {
      getItem: k => ls[k] ?? null,
      setItem: (k, v) => { const total = Object.entries(ls).reduce((s, [kk, vv]) => s + (kk === k ? 0 : vv.length), 0) + v.length; if (total > limiteLs) throw new Error('QuotaExceededError'); ls[k] = String(v) },
      removeItem: k => { delete ls[k] }
    },
    alert: m => alertas.push(String(m)), confirm: m => { alertas.push(String(m)); return true }, prompt: () => null
  };
  ctx.window.document = ctx.document;
  vm.createContext(ctx);
  for (const s of SCRIPTS) if (boot || !s.endsWith('main.js')) vm.runInContext(FONTES[s], ctx, { filename: s });
  const run = code => vm.runInContext(code, ctx);
  return { run, ls, alertas, html: () => app, ctx };
}

/** Clube da série `div` na posição `i` por força (0 = mais forte). */
export const clubeDaSerie = (j, div = 'A', i = 10) =>
  j.run(`getData().clubs.filter(c=>c.division==='${div}').sort((a,b)=>b.strength-a.strength)[${i}].id`);

/** Joga até o fim da temporada, corrigindo a escalação quando há indisponíveis.
 *  Por padrão a diretoria não demite (o sorteio ainda não tem semente, #26); use {demissao:true} para permitir. */
export function jogarTemporada(j, { demissao = false } = {}) {
  j.run(`(()=>{let n=0;while(S.round<S.fixtures.length&&!S.demitido&&n<80){${demissao ? '' : 'S.confBaixa=0;'}if(validateLineup())userClub().lineup=autoXI(userClub());playRound();n++}})()`);
}

/** Fecha a temporada e começa a próxima. */
export const virarTemporada = j => j.run('seasonEnd();newSeason()');

export const TELAS = ['clube', 'elenco', 'escalacao', 'tabela', 'jogos', 'artilharia', 'mercado', 'financas', 'dados', 'rodada'];
const SUSPEITOS = ['undefined', 'NaN', '[object'];
/** Renderiza cada tela e devolve a lista de problemas (texto suspeito ou erro). */
export function problemasNasTelas(j, telas = TELAS) {
  const erros = [];
  for (const t of telas) {
    try { j.run(`go('${t}')`) } catch (e) { erros.push(`${t}: ${e.message}`); continue }
    const h = j.html(), w = SUSPEITOS.find(x => h.includes(x));
    if (w) { const k = h.indexOf(w); erros.push(`${t}: "${h.slice(Math.max(0, k - 60), k + 30).replace(/\s+/g, ' ')}"`) }
  }
  return erros;
}

/** Joga uma rodada, trocando titulares lesionados/suspensos pela escalação automática. */
export const jogarRodada = (j, n = 1) => j.run(`for(let i=0;i<${n};i++){if(validateLineup())userClub().lineup=autoXI(userClub());playRound()}`);
