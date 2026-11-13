// #34: regras da rodada da liga (o que a função jogar-rodada roda no servidor)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

const raiz = new URL('../core/', import.meta.url);
const { iniciarLiga, jogarRodadaLiga, erroSeries, aplicarEntrada, acaoMercadoLiga } = await import(new URL('liga.mjs', raiz));
const est = await import(new URL('estado.mjs', raiz)), { usarEstado, clubDo } = est;
const { DADOS_PADRAO } = await import(new URL('dados-padrao.mjs', raiz));

const copia = x => JSON.parse(JSON.stringify(x));
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

// #35: mercado da liga
// elenco com vaga (os clubes reais chegam a 32 jogadores, o limite)
const comVaga = s => { for (const t of Object.values(s.managers)) { const c = s.clubs.find(c => c.id === t.clubId); c.players = c.players.slice(0, 25); c.lineup = c.lineup.filter(id => c.players.some(p => p.id === id)) } return s };
const jogadorDaIA = (s, pos = 'M') => { // de um clube da IA com reserva na posição (senão a IA recusa sempre)
  const humanos = Object.values(s.managers).map(t => t.clubId);
  const c = s.clubs.find(c => !humanos.includes(c.id) && c.players.filter(p => p.pos === pos).length > 4);
  return [...c.players].filter(p => p.pos === pos).sort((a, b) => a.ovr - b.ovr)[0];
};

test('mercado da liga: mesmo estado e mesma proposta dão a mesma resposta (recarregar não muda nada)', () => {
  const s = comVaga(JSON.parse(novaLiga(['A']))), p = jogadorDaIA(s);
  const proposta = { tipo: 'compra', pid: p.id, valor: Math.round(p.value * 0.9 * 10) / 10 }; // resposta sorteada
  const r1 = JSON.stringify(acaoMercadoLiga(copia(s), 'u-ana', proposta)), s1 = JSON.stringify(est.S);
  const r2 = JSON.stringify(acaoMercadoLiga(copia(s), 'u-ana', proposta)), s2 = JSON.stringify(est.S);
  assert.equal(r1, r2); assert.equal(s1, s2);
  const de_novo = acaoMercadoLiga(JSON.parse(s1), 'u-ana', proposta);
  assert.ok(de_novo.erro || de_novo.ok, 'segunda proposta na mesma rodada');
  if (!JSON.parse(r1).ok) assert.match(de_novo.erro, /de novo nesta rodada/, 'recusada: não dá para tentar de novo na mesma rodada');
});

test('mercado da liga: negócio fechado vira notícia para todos e o dinheiro sai do caixa', () => {
  const s = comVaga(JSON.parse(novaLiga(['A']))), p = jogadorDaIA(s);
  const ana = s.clubs.find(c => c.id === s.managers['u-ana'].clubId); ana.balance = 1000;
  const r = acaoMercadoLiga(s, 'u-ana', { tipo: 'compra', pid: p.id, valor: p.value * 3 }); // bem acima do valor: aceita sempre
  assert.equal(r.ok, true, r.msg);
  assert.equal(est.P[p.id].clubId, ana.id);
  assert.ok(est.clubById(ana.id).balance < 1000);
  assert.match(est.S.managers['u-bia'].news[0].t, new RegExp(`${ana.name}: .*${p.name}`));
});

test('mercado da liga: nada com clube de outro técnico, e o que vem do navegador é conferido', () => {
  const s = comVaga(JSON.parse(novaLiga(['A']))), bia = s.managers['u-bia'].clubId, ana = s.managers['u-ana'].clubId;
  const daBia = s.clubs.find(c => c.id === bia).players[0], daAna = s.clubs.find(c => c.id === ana).players[0], ia = jogadorDaIA(s);
  const r = a => acaoMercadoLiga(copia(s), 'u-ana', a);
  assert.match(r({ tipo: 'compra', pid: daBia.id, valor: 999 }).erro, /outro técnico/);
  assert.match(r({ tipo: 'emprestimo', mode: 'in', pid: daBia.id, dur: 5, payer: 'to' }).erro, /outro técnico/);
  assert.match(r({ tipo: 'emprestimo', mode: 'out', pid: daAna.id, clubeId: bia, dur: 5, payer: 'to' }).erro, /outro técnico/);
  assert.match(r({ tipo: 'emprestimo', mode: 'in', pid: ia.id, dur: 999, payer: 'to' }).erro, /inválida/);
  assert.match(r({ tipo: 'emprestimo', mode: 'in', pid: ia.id, dur: 5, payer: 'eu' }).erro, /inválida/);
  assert.match(r({ tipo: 'compra', pid: ia.id, valor: 'abc' }).erro, /inválido/i);
  assert.match(r({ tipo: 'compra', pid: daAna.id, valor: 1 }).erro, /inválido/);
  assert.match(r({ tipo: 'venderJa', pid: ia.id }).erro, /inválido/);
  for (const tipo of ['apagarTudo', 'constructor', 'toString', '__proto__']) assert.match(r({ tipo }).erro, /desconhecida/);
  for (let i = 0; i < 20; i++) { // venda rápida nunca vai para o clube de outro técnico
    const x = copia(s), meu = x.clubs.find(c => c.id === ana).players[i];
    assert.ok(acaoMercadoLiga(x, 'u-ana', { tipo: 'venderJa', pid: meu.id }).ok);
    assert.notEqual(est.P[meu.id].clubId, bia);
  }
});
