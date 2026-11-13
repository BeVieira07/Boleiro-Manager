// #42: regras que mexem em dinheiro, posições e evolução, que ainda não tinham teste próprio.
// (Temporada inteira, virada, formações, penalidades e empréstimo que volta já estão em jogo.test.mjs.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarJogo, clubeDaSerie, jogarRodada, jogarTemporada } from './jogo.mjs';

const novo = (div = 'A', i = 10) => { const j = carregarJogo({ boot: true }); j.run(`newGame('${clubeDaSerie(j, div, i)}')`); return j };
// empresta o jogador mais caro de outro clube ao meu (ou o meu a outro), com quem paga o salário
const emprestar = (j, { aMim, payer, buy = null }) => j.run(`(()=>{const uc=userClub(),o=S.clubs.find(c=>c.id!==uc.id),de=${aMim}?o:uc,para=${aMim}?uc:o;
  const p=[...de.players].sort((a,b)=>b.wage-a.wage)[${aMim ? 0 : 20}]; // de mim, um reserva
  startLoan({pid:p.id,from:de.id,to:para.id,until:S.round+3,payer:'${payer}',buy:${buy}});return p.id})()`);

test('salário do emprestado: entra na folha de quem paga', () => {
  for (const [aMim, payer, naMinha] of [[true, 'from', false], [true, 'to', true], [false, 'from', true], [false, 'to', false]]) {
    const j = novo();
    const antes = j.run('wageBill(userClub())');
    const pid = emprestar(j, { aMim, payer });
    const w = j.run(`P['${pid}'].wage`), depois = j.run('wageBill(userClub())');
    const esperado = aMim ? (naMinha ? antes + w : antes) : (naMinha ? antes : antes - w);
    assert.ok(Math.abs(depois - esperado) < 1e-9, `${aMim ? 'recebi' : 'cedi'}, paga ${payer}: ${depois} ≠ ${esperado}`);
  }
});

test('opção de compra: o jogador fica de vez, o caixa paga e o empréstimo acaba', () => {
  const j = novo();
  j.run('userClub().balance=1000');
  const pid = emprestar(j, { aMim: true, payer: 'to', buy: 5 });
  j.run(`buyLoaned('${pid}')`); // a confirmação responde "sim" nos testes
  assert.equal(j.run('userClub().balance'), 995);
  assert.equal(j.run(`loanOf('${pid}')`), undefined);
  jogarRodada(j, 4); // depois do prazo, não volta
  assert.equal(j.run(`P['${pid}'].clubId`), j.run('userClub().id'));
});

test('save antigo com as siglas de posição de antes da #23 (MEI, MAT, PON, CEN) carrega e joga', () => {
  const a = novo();
  const s = JSON.parse(a.run('JSON.stringify(S)'));
  const volta = { MC: 'MEI', MEI: 'MAT', ATA: 'CEN', PE: 'PON', PD: 'PON' };
  for (const c of s.clubs) for (const p of c.players) { p.pd = volta[p.pd] || p.pd; p.ps = (p.ps || []).map(k => volta[k] || k) }
  delete s.posv; delete s.versao;
  const j = carregarJogo({ boot: true, ls: { brasfoot_save_v1: JSON.stringify(s) } }); // abre pelo caminho de um save de verdade
  j.run('abrirSave(indiceSaves().cur)');
  const siglas = j.run('[...new Set(S.clubs.flatMap(c=>c.players.flatMap(p=>[p.pd,...(p.ps||[])])))]');
  assert.deepEqual(siglas.filter(k => ['MAT', 'PON', 'CEN'].includes(k)), [], 'nenhuma sigla antiga');
  assert.ok(siglas.includes('MC') && siglas.includes('ATA'));
  jogarRodada(j);
  assert.equal(j.run('S.round'), 1);
});

test('dados antigos da aba Dados (sem posv) viram as posições novas no jogo novo', () => {
  const j = carregarJogo({ boot: true });
  const d = JSON.parse(j.run('JSON.stringify(getData())'));
  delete d.posv;
  for (const c of d.clubs) for (const p of c.players) if (p.pd === 'ATA') p.pd = 'CEN';
  const k = carregarJogo({ boot: true, ls: { [j.run('DATA_KEY')]: JSON.stringify(d) } });
  k.run(`newGame('${clubeDaSerie(k)}')`);
  assert.equal(k.run("S.clubs.some(c=>c.players.some(p=>p.pd==='CEN'))"), false);
});

test('numa temporada, o desempenho muda o overall no máximo 3 pontos, e caixa e confiança seguem números', () => {
  const j = novo('A', 3);
  jogarTemporada(j);
  j.run('aplicarFormaPendente()');
  assert.equal(j.run('S.clubs.flatMap(c=>c.players).every(p=>Math.abs(p.ovr-(p.oT??p.o0??p.ovr))<=FORMA_MAX_TEMP)'), true);
  assert.equal(j.run('S.clubs.every(c=>c.balance==null||Number.isFinite(c.balance))'), true, 'caixa sem NaN');
  assert.equal(j.run('Number.isFinite(tec().conf)'), true, 'confiança sem NaN');
});
