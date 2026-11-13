// #60: Elenco como tabela moderna
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarJogo, clubeDaSerie, jogarRodada, problemasNasTelas } from './jogo.mjs';

const nomes = h => [...h.matchAll(/class="c-nome"><div class="jogador"><span[^>]*>[^<]*<\/span>(?:<span class="sr">[^<]*<\/span>)?<div><b>([^<]+)<\/b>/g)].map(m => m[1]);

test('filtrar por grupo e buscar atualizam a lista', () => {
  const j = carregarJogo({ boot: true });
  j.run(`newGame('${clubeDaSerie(j)}');go('elenco')`);
  const total = j.run('userClub().players.length'), gols = j.run(`userClub().players.filter(p=>p.pos==='G').length`);
  assert.equal(nomes(j.html()).length, total);
  assert.match(j.html(), new RegExp(`Goleiros <span class="n">${gols}</span>`), 'chip com a contagem');
  j.acao('filtrarElenco|grupo|G');
  assert.equal(nomes(j.html()).length, gols);
  assert.match(j.html(), /class="chip on" aria-pressed="true" data-acao="filtrarElenco\|grupo\|G"/);
  j.acao('filtrarElenco|grupo|');
  const alvo = j.run('userClub().players[5].name');
  j.acao('filtrarElenco|q', alvo.slice(0, 5).toUpperCase());
  assert.ok(nomes(j.html()).includes(alvo), 'busca sem diferenciar maiúsculas');
  assert.ok(nomes(j.html()).every(n => n.toLowerCase().includes(alvo.slice(0, 5).toLowerCase())));
  j.acao('filtrarElenco|q', 'zzzz-ninguem');
  assert.match(j.html(), /Nenhum jogador com esse filtro/);
});

test('clicar no título da coluna ordena crescente e depois decrescente', () => {
  const j = carregarJogo({ boot: true });
  j.run(`newGame('${clubeDaSerie(j)}');go('elenco')`);
  const idades = () => j.run('filtrar(userClub().players,ui.ef).map(p=>p.age)');
  j.acao('filtrarElenco|ord|idade');
  assert.deepEqual(idades(), [...idades()].sort((a, b) => a - b));
  assert.match(j.html(), /aria-sort="ascending"><button[^>]*filtrarElenco\|ord\|idade/);
  j.acao('filtrarElenco|ord|idade');
  assert.deepEqual(idades(), [...idades()].sort((a, b) => b - a));
  assert.match(j.html(), /aria-sort="descending"><button[^>]*filtrarElenco\|ord\|idade/);
});

test('tendência e forma mostram os valores reais do jogador; ações de mercado continuam', () => {
  const j = carregarJogo({ boot: true });
  j.run(`newGame('${clubeDaSerie(j)}')`);
  jogarRodada(j, 3);
  j.run(`const p=userClub().players[0];p.o0=p.ovr-2;p.forma=1;go('elenco')`);
  const id = j.run('userClub().players[0].id');
  assert.match(j.html(), /▲ \+2/);
  assert.match(j.html(), /Forma 75%/);
  j.acao(`toggleListed|${id}`);
  assert.equal(j.run(`P['${id}'].listed`), true);
  assert.match(j.html(), new RegExp(`data-acao="toggleListed\\|${id}" aria-pressed="true">À venda`));
  assert.match(j.html(), /data-acao="quickSell\|/);
  assert.match(j.html(), /data-acao="loanForm\|[^|]+\|out"/);
  assert.deepEqual(problemasNasTelas(j, ['elenco']), []);
});
