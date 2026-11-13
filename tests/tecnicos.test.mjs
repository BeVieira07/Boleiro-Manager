// #28: vários técnicos no mesmo estado do jogo
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarJogo, clubeDaSerie } from './jogo.mjs';

// jogo com dois técnicos: Ana (clube forte da Série A) e Bia (clube da Série B)
function doisTecnicos() {
  const j = carregarJogo();
  const a = clubeDaSerie(j, 'A', 2), b = clubeDaSerie(j, 'B', 4);
  j.run(`criarJogo([{id:'ana',nome:'Ana',clubId:'${a}'},{id:'bia',nome:'Bia',clubId:'${b}'}],getData())`);
  return { j, a, b };
}
const rodada = j => j.run(`(()=>{for(const t of tecnicos()){const c=clubDo(t);if(validateLineup(c))c.lineup=autoXI(c)}return jogarRodada()})()`);

test('cada técnico tem seu clube, confiança, meta, notícias e propostas', () => {
  const { j, a, b } = doisTecnicos();
  assert.equal(j.run('tecnicos().length'), 2);
  assert.equal(j.run('S.atual'), 'ana');
  assert.equal(j.run('userClub().id'), a);
  for (const [id, clube] of [['ana', a], ['bia', b]]) {
    const t = JSON.parse(j.run(`JSON.stringify(S.managers['${id}'])`));
    assert.equal(t.clubId, clube);
    assert.equal(t.conf, 60);
    assert.ok(t.meta && t.meta.texto, `${id} tem meta`);
    assert.match(t.news[0].t, /assumiu o comando/);
    assert.deepEqual(t.offers, []);
  }
  assert.notEqual(j.run(`S.managers.ana.meta.texto`) + j.run(`clubById('${a}').division`), j.run(`S.managers.bia.meta.texto`) + j.run(`clubById('${b}').division`));
});

test('caixa e finanças ficam no clube; clubes da IA também têm caixa', () => {
  const { j, a, b } = doisTecnicos();
  assert.equal(j.run('S.clubs.every(c=>Number.isFinite(c.balance))'), true);
  assert.equal(j.run('"balance" in S'), false);
  const antes = { a: j.run(`clubById('${a}').balance`), b: j.run(`clubById('${b}').balance`) };
  rodada(j);
  assert.notEqual(j.run(`clubById('${a}').balance`), antes.a, 'Ana recebeu/pagou na rodada');
  assert.notEqual(j.run(`clubById('${b}').balance`), antes.b, 'Bia recebeu/pagou na rodada');
  assert.ok(j.run(`clubById('${a}').fin.some(f=>f.desc.startsWith('Cota de TV'))`));
  assert.ok(j.run(`clubById('${b}').fin.some(f=>f.desc.startsWith('Cota de TV'))`));
});

test('a rodada atualiza a diretoria dos dois e respeita as duas escalações', () => {
  const { j, b } = doisTecnicos();
  // Bia escala um time só com reservas: a escalação dela precisa ser usada, não a automática
  j.run(`usarTecnico('bia');(()=>{const c=userClub(),xi=new Set(c.lineup),res=c.players.filter(p=>!xi.has(p.id)&&p.pos!=='G').slice(0,10),g=c.players.find(p=>p.pos==='G'&&!xi.has(p.id))||c.players.find(p=>p.pos==='G');c.lineup=[g.id,...res.map(p=>p.id)]})()`);
  const minha = j.run(`JSON.stringify(clubById('${b}').lineup)`);
  assert.equal(j.run(`JSON.stringify(getXI(clubById('${b}')))`), minha, 'getXI usa a escalação da Bia');
  j.run(`usarTecnico('ana')`);
  rodada(j);
  assert.ok(j.run('S.managers.ana.confFat.length') > 0);
  assert.ok(j.run('S.managers.bia.confFat.length') > 0);
});

test('escalação inválida de qualquer técnico impede a rodada e diz de quem é', () => {
  const { j, b } = doisTecnicos();
  j.run(`clubById('${b}').lineup=clubById('${b}').lineup.slice(0,9)`);
  const r = JSON.parse(j.run('JSON.stringify(jogarRodada())'));
  assert.equal(r.tecnico, 'bia');
  assert.match(r.erro, /^Bia: /);
  assert.equal(j.run('S.round'), 0);
});

test('ações valem para o técnico da vez', () => {
  const { j, a, b } = doisTecnicos();
  j.run(`usarTecnico('bia')`);
  assert.equal(j.run('userClub().id'), b);
  j.run('(()=>{const c=userClub();c.players=c.players.filter(p=>c.lineup.includes(p.id)).concat(c.players.filter(p=>!c.lineup.includes(p.id)).slice(0,12));reindex()})()'); // abre vaga no elenco
  const caixaAna = j.run(`clubById('${a}').balance`);
  const pid = j.run(`Object.values(P).find(p=>!ehHumano(p.clubId)&&p.value<1&&clubById(p.clubId).players.filter(x=>x.pos===p.pos).length>4).id`);
  const r = JSON.parse(j.run(`JSON.stringify(proporCompra('${pid}',Math.min(userClub().balance,P['${pid}'].value*1.5)))`));
  assert.ok(!r.erro, r.erro);
  assert.equal(j.run(`clubById('${a}').balance`), caixaAna, 'o caixa da Ana não mudou');
  assert.ok(j.run(`S.managers.bia.news.some(n=>/Contratado|recusou/.test(n.t))`));
  assert.ok(!j.run(`S.managers.ana.news.some(n=>/Contratado|recusou/.test(n.t))`), 'a notícia é só da Bia');
});

test('propostas por jogadores à venda vão para o técnico dono do jogador', () => {
  const { j, b } = doisTecnicos();
  j.run(`clubById('${b}').players.forEach(p=>{if(!clubById('${b}').lineup.includes(p.id))p.listed=true})`);
  for (let i = 0; i < 6; i++) rodada(j);
  assert.ok(j.run('S.managers.bia.offers.length') > 0, 'Bia recebeu propostas');
  assert.ok(j.run(`S.managers.bia.offers.every(o=>P[o.pid].clubId==='${b}')`));
  assert.equal(j.run('S.managers.ana.offers.length'), 0);
});

test('fim e começo de temporada para todos os técnicos', () => {
  const { j, a, b } = doisTecnicos();
  j.run(`for(const t of tecnicos())t.confBaixa=0`);
  for (let i = 0; i < 38; i++) { j.run('for(const t of tecnicos())t.confBaixa=0'); rodada(j) }
  j.run('fecharTemporada()');
  assert.ok(j.run(`clubById('${a}').fin.some(f=>f.desc.startsWith('Premiação'))`));
  assert.ok(j.run(`clubById('${b}').fin.some(f=>f.desc.startsWith('Premiação'))`));
  assert.deepEqual(Object.keys(JSON.parse(j.run('JSON.stringify(S.history[0].tecnicos)'))).sort(), ['ana', 'bia']);
  j.run('iniciarTemporada()');
  assert.equal(j.run('S.round'), 0);
  assert.equal(j.run('tecnicos().every(t=>clubDo(t).lineup.length===11&&t.offers.length===0)'), true);
  assert.ok(j.run(`S.managers.bia.news.some(n=>n.t.includes('Começa a temporada'))`));
});

test('save de antes da #28 vira o técnico "local", com o caixa no clube', () => {
  const j = carregarJogo();
  const c = clubeDaSerie(j);
  j.run(`newGame('${c}')`);
  const s = JSON.parse(j.run('JSON.stringify(S)'));
  const t = s.managers.local, clube = s.clubs.find(x => x.id === c), caixa = clube.balance;
  const antigo = { ...s, userClubId: c, balance: clube.balance, fin: clube.fin, conf: 42, confBaixa: 1, confFat: [], meta: t.meta, demitido: false, news: t.news, offers: [] };
  delete antigo.managers; delete antigo.atual;
  for (const x of antigo.clubs) { delete x.balance; delete x.fin }
  j.run(`usarEstado(${JSON.stringify(antigo)});reindex()`);
  assert.equal(j.run('S.atual'), 'local');
  assert.equal(j.run('tec().clubId'), c);
  assert.equal(j.run('tec().conf'), 42);
  assert.equal(j.run('userClub().balance'), caixa);
  assert.equal(j.run('"userClubId" in S || "balance" in S'), false);
});
