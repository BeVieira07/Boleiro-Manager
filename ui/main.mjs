/* ================= início ================= */
// Ponto de entrada da tela. As ações dos botões usam delegação de eventos:
//   data-acao="nome|arg1|arg2"  -> clique chama nome('arg1','arg2')
//   data-mudar="nome|arg1"      -> mudança (select, input, arquivo) chama nome('arg1', valor, evento)
// `nome` precisa ser uma função exportada por algum módulo de ui/.
import { usarEstado } from '../core/estado.mjs';
import * as api from './api.mjs';
import * as conta from './conta.mjs';
import * as diretoria from './diretoria.mjs';
import * as emprestimos from './emprestimos.mjs';
import * as escalacao from './escalacao.mjs';
import * as estado from './estado.mjs';
import * as forma from './forma.mjs';
import * as liga from './liga.mjs';
import * as mercado from './mercado.mjs';
import * as motor from './motor.mjs';
import * as partida from './partida.mjs';
import * as posicoes from './posicoes.mjs';
import * as saves from './saves.mjs';
import * as taticas from './taticas.mjs';
import * as telas from './telas.mjs';
import * as utils from './utils.mjs';

export const acoes = Object.fromEntries(
  [api, conta, diretoria, emprestimos, escalacao, estado, forma, liga, mercado, motor, partida, posicoes, saves, taticas, telas, utils]
    .flatMap(m => Object.entries(m)).filter(([, f]) => typeof f === 'function'));

/** Executa a ação descrita em data-acao / data-mudar. */
export function executar(spec, extra = []) {
  const [nome, ...args] = spec.split('|');
  const f = acoes[nome];
  if (!f) { console.error('Ação desconhecida:', nome); return }
  return f(...args, ...extra);
}

export function ligarEventos(doc = document) {
  doc.addEventListener('click', ev => {
    const el = ev.target.closest && ev.target.closest('[data-acao]');
    if (el) executar(el.dataset.acao);
  });
  doc.addEventListener('change', ev => {
    const el = ev.target.closest && ev.target.closest('[data-mudar]');
    if (el) executar(el.dataset.mudar, [el.value, ev]);
  });
}

export function iniciar() {
  saves.migrarSaveAntigo(); // save de slot único (versões antigas) vira o primeiro da lista
  usarEstado(null); estado.ui.view = 'menu'; // tela inicial: continuar, carregar ou começar um jogo
  telas.render();
}

if (!globalThis.__TESTE__) {
  ligarEventos(); iniciar();
  conta.iniciarConta(() => { if (estado.ui.view === 'menu') telas.render() }); // login online (só se ui/config.mjs estiver preenchido)
}
