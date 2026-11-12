import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carregarJogo, clubeDaSerie, jogarRodada, virarTemporada, jogarTemporada } from './jogo.mjs';

// estado de partida comum: jogo novo com uma rodada jogada
function estadoInicial(seed) {
  const j = carregarJogo();
  j.run(`newGame('${clubeDaSerie(j)}');S.seed=${seed};S.rng=${seed}`);
  jogarRodada(j);
  return j.run('JSON.stringify(S)');
}
// carrega o estado num jogo novo (outro "computador") e joga n rodadas
function jogarAPartirDe(estado, n, extra = '') {
  const j = carregarJogo();
  j.run(`S=JSON.parse(${JSON.stringify(estado)});reindex();${extra}`);
  jogarRodada(j, n);
  return j;
}

test('mesmo estado + mesma semente = exatamente o mesmo resultado', () => {
  const e = estadoInicial(12345);
  const a = jogarAPartirDe(e, 4), b = jogarAPartirDe(e, 4);
  assert.equal(a.run('S.round'), 5);
  assert.equal(a.run('JSON.stringify(S)'), b.run('JSON.stringify(S)'));
});

test('a rodada não depende do que foi sorteado antes dela', () => {
  const e = estadoInicial(777);
  const a = jogarAPartirDe(e, 1);
  const b = jogarAPartirDe(e, 1, 'for(let i=0;i<50;i++)rnd()'); // sorteios extras antes da rodada
  assert.equal(a.run('JSON.stringify(S.fixtures[1])'), b.run('JSON.stringify(S.fixtures[1])'));
});

test('sementes diferentes dão resultados diferentes', () => {
  const a = jogarAPartirDe(estadoInicial(1), 3), b = jogarAPartirDe(estadoInicial(2), 3);
  assert.notEqual(a.run('JSON.stringify(S.fixtures.slice(0,4))'), b.run('JSON.stringify(S.fixtures.slice(0,4))'));
});

test('virada de temporada também é reproduzível', () => {
  const e = estadoInicial(99);
  const r = () => { const j = jogarAPartirDe(e, 0); jogarTemporada(j); virarTemporada(j); return j.run('JSON.stringify(S)') };
  assert.equal(r(), r());
});

test('save antigo, sem semente, ganha uma ao carregar', () => {
  const s = JSON.parse(estadoInicial(5));
  delete s.seed; delete s.rng;
  const j = carregarJogo();
  j.run(`S=JSON.parse(${JSON.stringify(JSON.stringify(s))});reindex()`);
  assert.equal(j.run('Number.isInteger(S.seed)&&Number.isInteger(S.rng)'), true);
  jogarRodada(j);
  assert.equal(j.run('S.round'), 2);
});

test('nenhuma regra do jogo usa Math.random diretamente', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const arquivos = [...html.matchAll(/src="(js\/[^"]+)"/g)].map(m => m[1]).filter(f => !/dados-padrao|utils\.js|saves\.js/.test(f));
  const usos = arquivos.filter(f => readFileSync(new URL('../' + f, import.meta.url), 'utf8').includes('Math.random'));
  assert.deepEqual(usos, []);
});
