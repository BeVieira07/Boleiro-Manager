// #65: acessibilidade (teclado, nomes para leitor de tela, alvos de toque) em todas as telas
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { carregarJogo, clubeDaSerie, jogarRodada, TELAS } from './jogo.mjs';

function problemas(html, tela) {
  const out = [];
  // tudo que se clica é botão, link ou campo: dá para usar com o teclado
  for (const m of html.matchAll(/<(\w+)[^>]*\sdata-acao="[^"]*"/g)) if (!['button', 'a'].includes(m[1])) out.push(`${tela}: data-acao em <${m[1]}>`);
  // botão só com ícone precisa de nome
  for (const m of html.matchAll(/<button[^>]*class="[^"]*icone-so[^"]*"[^>]*>/g)) if (!/aria-label=/.test(m[0])) out.push(`${tela}: botão de ícone sem aria-label`);
  // imagens com texto alternativo (escudos decorativos usam alt="")
  for (const m of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt=/.test(m[0])) out.push(`${tela}: <img> sem alt`);
  // grupos de chips com nome
  for (const m of html.matchAll(/<div class="chips[^"]*"[^>]*>/g)) if (/role="group"/.test(m[0]) && !/aria-label=/.test(m[0])) out.push(`${tela}: grupo de chips sem nome`);
  // svg decorativo escondido, ou com nome
  for (const m of html.matchAll(/<svg\b[^>]*>/g)) if (!/aria-hidden="true"|aria-label=/.test(m[0])) out.push(`${tela}: svg sem aria-hidden nem nome`);
  // aria-label em span/div sem papel é ignorado pelo leitor de tela: use texto .sr
  for (const m of html.matchAll(/<(span|div|p|b|td|li)\b[^>]*aria-(label|labelledby)=[^>]*>/g)) if (!/\srole=/.test(m[0])) out.push(`${tela}: aria-label em <${m[1]}> sem role`);
  // campos com rótulo
  for (const m of html.matchAll(/<(input|select)\b[^>]*>/g)) {
    const t = m[0]; if (/type="(file|hidden)"/.test(t)) continue;
    const id = (t.match(/\sid="([^"]+)"/) || [])[1], antes = html.slice(Math.max(0, m.index - 300), m.index);
    if (!/aria-label=/.test(t) && !(id && html.includes(`for="${id}"`)) && !/<label[^>]*>(?:(?!<\/label>).)*$/s.test(antes)) out.push(`${tela}: campo sem rótulo ${t.slice(0, 60)}`);
  }
  return out;
}

test('todas as telas: clicáveis por teclado, ícones e campos com nome', () => {
  const j = carregarJogo({ boot: true });
  const erros = [...problemas(j.html(), 'menu')];
  j.run(`go('inicio')`); erros.push(...problemas(j.html(), 'inicio'));
  j.run(`newGame('${clubeDaSerie(j)}')`);
  jogarRodada(j, 2);
  for (const t of TELAS) { j.run(`go('${t}')`); erros.push(...problemas(j.html(), t)) }
  erros.push(...problemas(j.run('lateral()'), 'menu lateral'));
  assert.deepEqual(erros, []);
});

test('link para pular o menu, idioma da página e regras de toque e movimento', () => {
  const raiz = new URL('..', import.meta.url), html = readFileSync(new URL('index.html', raiz), 'utf8'), css = readFileSync(new URL('css/style.css', raiz), 'utf8');
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<a class="pular" href="#app">Pular para o conteúdo<\/a>/);
  assert.match(html, /<main id="app"[^>]*tabindex="-1"/, 'o conteúdo recebe o foco ao trocar de tela');
  assert.match(css, /@media\(pointer:coarse\)\{\.btn,\.btn\.sm,\.chip,input,select\{min-height:44px\}/);
  assert.match(css, /:focus-visible\{outline:0;box-shadow:var\(--foco\)\}/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});
