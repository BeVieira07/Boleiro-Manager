// #59: tela do Clube como painel
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarJogo, clubeDaSerie, jogarRodada, problemasNasTelas } from './jogo.mjs';

test('início da temporada: estados vazios coerentes', () => {
  const j = carregarJogo({ boot: true });
  j.run(`newGame('${clubeDaSerie(j)}');go('clube')`);
  const h = j.html();
  assert.match(h, /A temporada ainda não começou/);
  assert.match(h, /Ainda não houve jogos/);
  assert.match(h, /Próximo jogo/);
  assert.match(h, /Meta da temporada/);
  assert.deepEqual(problemasNasTelas(j, ['clube']), []);
});

test('depois de rodadas: forma recente com os resultados reais e notícias', () => {
  const j = carregarJogo({ boot: true });
  j.run(`newGame('${clubeDaSerie(j)}')`);
  jogarRodada(j, 6);
  j.run(`go('clube')`);
  const f = j.run('formaRecente(userClub().id)');
  assert.equal(f.length, 5);
  const bolas = [...j.html().matchAll(/class="bola-forma (V|E|D)"/g)].map(m => m[1]);
  assert.deepEqual(bolas, f.map(x => x.res).reverse(), 'as bolinhas batem com os jogos, do mais antigo ao mais recente');
  const pos = j.run('table(divOf(userClub())).findIndex(t=>t.id===userClub().id)+1');
  assert.match(j.html(), new RegExp(`stat-valor"[^>]*>${pos}º<`));
  assert.deepEqual(problemasNasTelas(j, ['clube']), []);
});

test('alertas levam à tela certa', () => {
  const j = carregarJogo({ boot: true });
  j.run(`newGame('${clubeDaSerie(j)}')`);
  // titular lesionado -> Escalação
  j.run('P[userClub().lineup[3]].inj=2');
  // proposta recebida -> botões de aceitar e recusar
  j.run(`const p=userClub().players[0];tec().offers.push({id:'o1',pid:p.id,from:S.clubs.find(c=>c.id!==userClub().id).id,amount:5,until:S.round+3})`);
  // caixa negativo -> Finanças
  j.run('userClub().balance=-2');
  const a = j.run('alertas()');
  assert.equal(a.find(x => x.titulo.includes('sem condição')).acao, 'go|escalacao');
  assert.match(a.find(x => x.titulo.startsWith('Proposta')).botoes, /acceptOffer\|o1/);
  assert.equal(a.find(x => x.titulo.includes('vermelho')).acao, 'go|financas');
  j.run(`go('clube')`);
  assert.match(j.html(), /data-acao="acceptOffer\|o1"/);
  j.acao('go|escalacao');
  assert.equal(j.run('ui.view'), 'escalacao');
});

test('trocar o estilo pelos chips do próximo jogo', () => {
  const j = carregarJogo({ boot: true });
  j.run(`newGame('${clubeDaSerie(j)}');go('clube')`);
  const outro = j.run(`Object.keys(ESTILOS).find(k=>k!==taticaUser(userClub()).estilo)`);
  j.acao(`tvPainel|estilo|${outro}`);
  assert.equal(j.run('taticaUser(userClub()).estilo'), outro);
  assert.match(j.html(), new RegExp(`class="chip on" aria-pressed="true" data-acao="tvPainel\\|estilo\\|${outro}"`));
});
