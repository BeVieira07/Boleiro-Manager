// Carrega o jogo (módulos de core/ e ui/) em Node, sem navegador, para os testes.
// - DOM falso mínimo: o HTML de cada tela vai para `j.html()` (o innerHTML de #app);
// - alert/confirm são registrados em `j.alertas`, e confirm sempre responde "sim";
// - localStorage é um objeto em memória (`j.ls`), com limite configurável para simular falta de espaço.
// `j.run('código')` roda o código com todos os exports de core/ e ui/ à vista (ex.: j.run('S.round')).
// Para trocar o jogo atual use usarEstado(...) (módulos não deixam atribuir S=...).
// Os módulos são carregados uma vez por arquivo de teste; carregarJogo() zera o estado entre os testes.
import { readdirSync } from 'node:fs';

const falso = () => new Proxy(function () {}, {
  get: (t, k) => k === 'value' ? '5' : k === 'checked' ? false : k === Symbol.toPrimitive ? () => '' : falso(),
  set: () => true, apply: () => falso()
});
const amb = { app: '', alertas: [], ls: {}, limite: Infinity };
const appEl = new Proxy({}, { set: (t, k, v) => { if (k === 'innerHTML') amb.app = v; return true }, get: () => falso() });
globalThis.__TESTE__ = true;
globalThis.document = { getElementById: id => id === 'app' ? appEl : falso(), querySelector: () => falso(), querySelectorAll: () => [], createElement: () => falso(), body: falso(), addEventListener() {} };
globalThis.window = { scrollTo() {}, addEventListener() {} };
globalThis.localStorage = {
  getItem: k => amb.ls[k] ?? null,
  setItem: (k, v) => { const total = Object.entries(amb.ls).reduce((s, [kk, vv]) => s + (kk === k ? 0 : vv.length), 0) + String(v).length; if (total > amb.limite) throw new Error('QuotaExceededError'); amb.ls[k] = String(v) },
  removeItem: k => { delete amb.ls[k] }
};
globalThis.alert = m => amb.alertas.push(String(m));
globalThis.confirm = m => { amb.alertas.push(String(m)); return true };
globalThis.prompt = () => null;

const RAIZ = new URL('..', import.meta.url);
const carregar = async dir => Promise.all(readdirSync(new URL(dir, RAIZ)).filter(f => f.endsWith('.mjs')).map(f => import(new URL(`${dir}/${f}`, RAIZ))));
const modulos = [...await carregar('core'), ...await carregar('ui')];
const main = await import(new URL('ui/main.mjs', RAIZ));
const { usarEstado } = await import(new URL('core/estado.mjs', RAIZ));
const { ui } = await import(new URL('ui/estado.mjs', RAIZ));
const { salvarJogo } = await import(new URL('ui/saves.mjs', RAIZ));
const UI_INICIAL = JSON.stringify(ui);

// todos os exports num só escopo (os valores são lidos na hora, então S/P aparecem atualizados)
const escopo = new Proxy({}, {
  has: (t, k) => typeof k === 'string' && modulos.some(m => k in m),
  get: (t, k) => { for (const m of modulos) if (k in m) return m[k] }
});
const avaliar = new Function('escopo', 'codigo', 'with (escopo) { return eval(codigo) }');

/** Começa do zero: sem jogo, armazenamento vazio (ou o `ls` dado). `boot: true` abre o jogo como no navegador. */
export function carregarJogo({ boot = false, ls = {}, limiteLs = Infinity } = {}) {
  amb.app = ''; amb.alertas = []; amb.ls = ls; amb.limite = limiteLs;
  usarEstado(null); Object.assign(ui, JSON.parse(UI_INICIAL)); salvarJogo.avisou = false;
  if (boot) main.iniciar();
  return { run: c => avaliar(escopo, c), ls: amb.ls, alertas: amb.alertas, html: () => amb.app, acao: (spec, ...extra) => main.executar(spec, extra), main };
}

/** Clube da série `div` na posição `i` por força (0 = mais forte). */
export const clubeDaSerie = (j, div = 'A', i = 10) =>
  j.run(`getData().clubs.filter(c=>c.division==='${div}').sort((a,b)=>b.strength-a.strength)[${i}].id`);

/** Joga até o fim da temporada, corrigindo a escalação quando há indisponíveis.
 *  Por padrão a diretoria não demite; use {demissao:true} para permitir. */
export function jogarTemporada(j, { demissao = false } = {}) {
  j.run(`(()=>{let n=0;while(S.round<S.fixtures.length&&!tec().demitido&&n<80){${demissao ? '' : 'tec().confBaixa=0;'}if(validateLineup())userClub().lineup=autoXI(userClub());playRound();n++}})()`);
}

/** Fecha a temporada e começa a próxima. */
export const virarTemporada = j => j.run('seasonEnd();newSeason()');

/** Joga uma rodada, trocando titulares lesionados/suspensos pela escalação automática. */
export const jogarRodada = (j, n = 1) => j.run(`for(let i=0;i<${n};i++){if(validateLineup())userClub().lineup=autoXI(userClub());playRound()}`);

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
