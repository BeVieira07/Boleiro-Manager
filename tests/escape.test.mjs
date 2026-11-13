// #47: ids e cores vindos de arquivos de fora não injetam HTML
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarJogo, clubeDaSerie } from './jogo.mjs';

const ler = (j, acao, texto) => { // o FileReader devolve o texto na hora
  globalThis.FileReader = class { readAsText() { this.result = texto; this.onload() } };
  j.acao(acao, '', { target: { files: [{}] } });
};
const MAL = '#fff;"><img src=x onerror=alert(1)>';

test('cor com aspas e onerror não vai para o HTML; cores normais continuam', () => {
  const j = carregarJogo({ boot: true });
  j.run(`newGame('${clubeDaSerie(j)}')`);
  const cor = j.run('userClub().color');
  j.run('userClub().logo=null');
  assert.match(j.run('crest(userClub())'), new RegExp(`background:${cor}`), 'cor normal');
  j.run(`userClub().color=${JSON.stringify(MAL)};render()`);
  assert.doesNotMatch(j.run('crest(userClub())'), /onerror=alert/);
  assert.doesNotMatch(j.html(), /onerror=alert/);
  assert.match(j.run('crest(userClub())'), /background:#335/);
});

test('arquivo de dados ou save com id malicioso é recusado', () => {
  const j = carregarJogo({ boot: true });
  const d = j.run('JSON.stringify(getData())'), dados = JSON.parse(d);
  dados.clubs[0].players[0].id = `x');alert(1);('`;
  ler(j, 'loadDataFile', JSON.stringify(dados));
  assert.ok(j.alertas.some(a => a.includes('id inválido')));
  assert.equal(j.run('getData().clubs[0].players[0].id'), JSON.parse(d).clubs[0].players[0].id, 'dados continuam os padrão');

  j.run(`newGame('${clubeDaSerie(j)}')`);
  const sv = JSON.parse(j.run('JSON.stringify(S)'));
  sv.clubs[1].id = '"><script>alert(1)</script>';
  const saves = j.run('indiceSaves().list.length');
  ler(j, 'loadSaveFile', JSON.stringify({ type: 'brasfoot-save', save: sv }));
  assert.ok(j.alertas.filter(a => a.includes('id inválido')).length === 2);
  assert.equal(j.run('indiceSaves().list.length'), saves, 'o save não foi importado');

  // dados normais continuam entrando
  ler(j, 'loadDataFile', d);
  assert.ok(j.alertas.some(a => a.includes('Dados carregados')));
});

test('dados importados antes da correção, com id inválido, são ignorados', () => {
  const j0 = carregarJogo();
  const d = JSON.parse(j0.run('JSON.stringify(getData())'));
  d.clubs[0].id = 'a b"';
  const j = carregarJogo({ ls: { [j0.run('DATA_KEY')]: JSON.stringify(d) } });
  assert.notEqual(j.run('getData().clubs[0].id'), 'a b"');
});
