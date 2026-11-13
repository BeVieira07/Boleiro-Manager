// #34: regras da rodada da liga (o que a função jogar-rodada roda no servidor)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const raiz = new URL('../core/', import.meta.url);
const { iniciarLiga, jogarRodadaLiga, erroSeries, aplicarEntrada } = await import(new URL('liga.mjs', raiz));
const est = await import(new URL('estado.mjs', raiz)), { usarEstado, clubDo } = est;
const { DADOS_PADRAO } = await import(new URL('dados-padrao.mjs', raiz));

const clubesDe = d => DADOS_PADRAO.clubs.filter(c => c.division === d).map(c => c.id);
function novaLiga(series = ['A', 'B']) {
  const [a, b] = [clubesDe(series[0])[0], clubesDe(series[series.length - 1])[1]];
  const r = iniciarLiga([{ user_id: 'u-ana', nome: 'Ana', club_id: a }, { user_id: 'u-bia', nome: 'Bia', club_id: b }], series, DADOS_PADRAO);
  assert.ok(r.ok, r.erro);
  return JSON.stringify(est.S);
}

test('séries precisam ser vizinhas e os clubes precisam ser delas', () => {
  assert.equal(erroSeries(['A', 'B']), null);
  assert.equal(erroSeries(['D', 'C', 'B']), null);
  assert.match(erroSeries(['A', 'C']), /vizinhas/);
  assert.match(erroSeries([]), /pelo menos/);
  const fora = iniciarLiga([{ user_id: 'u', nome: 'Ana', club_id: clubesDe('C')[0] }], ['A'], DADOS_PADRAO);
  assert.match(fora.erro, /não é das séries/);
  const sem = iniciarLiga([{ user_id: 'u', nome: 'Ana', club_id: null }], ['A'], DADOS_PADRAO);
  assert.match(sem.erro, /ainda não escolheu/);
});

test('uma temporada inteira, chamada a chamada, fica bem abaixo de 2 s de CPU por chamada', () => {
  let estado = novaLiga(['A', 'B']), max = 0, chamadas = 0, virada = null;
  const temporada0 = JSON.parse(estado).season;
  while (!virada) {
    const t0 = performance.now();
    const r = jogarRodadaLiga(JSON.parse(estado), {}); // como no servidor: lê o JSON, joga e grava o JSON
    estado = JSON.stringify(est.S);
    max = Math.max(max, performance.now() - t0); chamadas++;
    assert.equal(r.jogos.length, 20, 'dez jogos em cada série');
    virada = r.virada;
  }
  console.log(`  ${chamadas} chamadas; a mais lenta levou ${max.toFixed(0)} ms`);
  assert.equal(chamadas, JSON.parse(estado).fixtures.length);
  assert.equal(JSON.parse(estado).season, temporada0 + 1, 'a última chamada já vira a temporada');
  assert.equal(JSON.parse(estado).round, 0);
  assert.ok(virada.campeoes.length === 2);
  assert.ok(max < 1000, `${max} ms`);
});

test('mesmo estado e mesmas escolhas dão o mesmo resultado', () => {
  const estado = novaLiga(['A']);
  const e = { 'u-ana': { pronto: true, estilo: 'contra', modo: 'ofensivo', formacao: '4-3-3', escalacao: { lineup: [] } } };
  const r1 = JSON.stringify(jogarRodadaLiga(JSON.parse(estado), e)), s1 = JSON.stringify(est.S);
  const r2 = JSON.stringify(jogarRodadaLiga(JSON.parse(estado), e)), s2 = JSON.stringify(est.S);
  assert.equal(r1, r2); assert.equal(s1, s2);
});

test('escolha inválida vinda do navegador vira escalação automática e tática padrão', () => {
  usarEstado(JSON.parse(novaLiga(['A'])));
  const uc = clubDo(est.S.managers['u-ana']), outro = est.S.clubs.find(c => c.id !== uc.id);
  for (const lineup of [[outro.players[0].id, ...uc.players.slice(0, 10).map(p => p.id)], uc.players.slice(0, 10).map(p => p.id), Array(11).fill(uc.players[0].id), 'x']) {
    aplicarEntrada(uc, { escalacao: { lineup }, formacao: 'não-existe', estilo: '<script>', modo: 1 });
    assert.equal(uc.lineup.length, 11);
    assert.ok(uc.lineup.every(id => uc.players.some(p => p.id === id)));
    assert.deepEqual(uc.tatica, { estilo: 'equilibrado', modo: 'equilibrado' });
  }
  const certo = uc.players.slice(0, 11).map(p => p.id);
  aplicarEntrada(uc, { escalacao: { lineup: certo }, formacao: '3-5-2', estilo: 'toque', modo: 'defensivo' });
  assert.deepEqual(uc.lineup, certo);
  assert.equal(uc.formation, '3-5-2');
  assert.equal(uc.tatica.modo, 'defensivo');
});

test('quem confirmou joga com a própria escolha; quem não confirmou, com a automática', () => {
  const estado = JSON.parse(novaLiga(['A']));
  usarEstado(estado);
  const uc = clubDo(est.S.managers['u-ana']), reservas = uc.players.slice(-11).map(p => p.id);
  jogarRodadaLiga(estado, { 'u-ana': { pronto: true, escalacao: { lineup: reservas }, formacao: '4-4-2' }, 'u-bia': { pronto: false, escalacao: { lineup: [] } } });
  assert.deepEqual(clubDo(est.S.managers['u-ana']).lineup.filter(id => reservas.includes(id)).length > 0, true);
});

test('técnico demitido não trava a liga', () => {
  const estado = JSON.parse(novaLiga(['A']));
  estado.managers['u-ana'].demitido = true; estado.managers['u-ana'].conf = 0; estado.managers['u-ana'].confBaixa = 99;
  const r = jogarRodadaLiga(estado, {});
  assert.equal(r.jogos.length, 10);
  assert.equal(est.S.round, 1);
});
