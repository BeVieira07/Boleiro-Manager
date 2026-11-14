// scripts/fixar-core.mjs: troca o commit dos imports do core/ na função jogar-rodada
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FUNCAO, commitsFixados, fixarCommit } from '../scripts/fixar-core.mjs';

test('fixar-core troca o commit dos três imports do core/ e nada mais', () => {
  const texto = readFileSync(FUNCAO, 'utf8');
  assert.equal(commitsFixados(texto).length, 1, 'os três imports estão no mesmo commit');
  const novo = 'a'.repeat(40), trocado = fixarCommit(texto, novo);
  assert.deepEqual(commitsFixados(trocado), [novo]);
  assert.equal((trocado.match(new RegExp(novo, 'g')) || []).length, 3);
  assert.equal(trocado.replaceAll(novo, commitsFixados(texto)[0]), texto, 'o resto do arquivo não muda');
});
