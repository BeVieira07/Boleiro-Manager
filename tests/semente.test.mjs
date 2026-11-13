import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { carregarJogo, clubeDaSerie, jogarRodada, virarTemporada, jogarTemporada } from './jogo.mjs';

// estado de partida comum: jogo novo com uma rodada jogada
function estadoInicial(seed) {
  const j = carregarJogo();
  j.run(`newGame('${clubeDaSerie(j)}');S.seed=${seed};S.rng=${seed}`);
  jogarRodada(j);
  return j.run('JSON.stringify(S)');
}
// carrega o estado como se fosse outro "computador", joga n rodadas e devolve o estado final em JSON
// (os módulos são compartilhados no arquivo de teste, então o resultado é lido logo depois de jogar)
function jogarAPartirDe(estado, n, { extra = '', temporada = false } = {}) {
  const j = carregarJogo();
  j.run(`usarEstado(JSON.parse(${JSON.stringify(estado)}));reindex();${extra}`);
  jogarRodada(j, n);
  if (temporada) { jogarTemporada(j); virarTemporada(j) }
  return JSON.parse(j.run('JSON.stringify(S)'));
}

test('mesmo estado + mesma semente = exatamente o mesmo resultado', () => {
  const e = estadoInicial(12345);
  const a = jogarAPartirDe(e, 4), b = jogarAPartirDe(e, 4);
  assert.equal(a.round, 5);
  assert.deepEqual(a, b);
});

test('a rodada não depende do que foi sorteado antes dela', () => {
  const e = estadoInicial(777);
  const a = jogarAPartirDe(e, 1);
  const b = jogarAPartirDe(e, 1, { extra: 'for(let i=0;i<50;i++)rnd()' }); // sorteios extras antes da rodada
  assert.deepEqual(a.fixtures[1], b.fixtures[1]);
});

test('sementes diferentes dão resultados diferentes', () => {
  const a = jogarAPartirDe(estadoInicial(1), 3), b = jogarAPartirDe(estadoInicial(2), 3);
  assert.notDeepEqual(a.fixtures.slice(0, 4), b.fixtures.slice(0, 4));
});

test('virada de temporada também é reproduzível', () => {
  const e = estadoInicial(99);
  assert.deepEqual(jogarAPartirDe(e, 0, { temporada: true }), jogarAPartirDe(e, 0, { temporada: true }));
});

test('save antigo, sem semente, ganha uma ao carregar', () => {
  const s = JSON.parse(estadoInicial(5));
  delete s.seed; delete s.rng;
  const j = carregarJogo();
  j.run(`usarEstado(JSON.parse(${JSON.stringify(JSON.stringify(s))}));reindex()`);
  assert.equal(j.run('Number.isInteger(S.seed)&&Number.isInteger(S.rng)'), true);
  jogarRodada(j);
  assert.equal(j.run('S.round'), 2);
});

test('nenhuma regra do jogo usa Math.random diretamente', () => {
  const dir = new URL('../core/', import.meta.url);
  const usos = readdirSync(dir).filter(f => f.endsWith('.mjs') && f !== 'utils.mjs' && readFileSync(new URL(f, dir), 'utf8').includes('Math.random'));
  assert.deepEqual(usos, []);
});
