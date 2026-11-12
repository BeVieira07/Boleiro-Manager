---
name: boleiro-manager
description: Como o Boleiro-Manager guarda e atualiza jogadores, times, overalls e escudos, como rodar o jogo, e as regras de trabalho do projeto (issues, commits, idioma). Use ao mexer em dados, escudos, saves ou ao abrir issues.
---

# Boleiro-Manager

Manager de futebol estilo Brasfoot, em JS puro, sem build. Brasileirão Séries A, B, C e D de 2024 (dados da API-Football). Responder sempre em **PT-BR**.

## Regras de trabalho
- Repositório: `BeVieira07/Boleiro-Manager`. Usar a conta **BeVieira07** (o `gh` tem outras contas logadas).
- Commitar e dar push no `main` com a BeVieira07, **sem** `Co-Authored-By` do Claude.
- Issues: criar com `gh issue create --repo BeVieira07/Boleiro-Manager`, com título curto, descrição (contexto, proposta, critérios de aceite) e label (`enhancement`, `bug`, `documentation`). Mostrar o rascunho antes de criar, salvo quando o pedido já for explícito. Tarefas independentes viram issues separadas.
- **Uma branch por issue:** ao resolver uma issue, criar a branch a partir do `main` atualizado, com o nome `issue-N-resumo-curto` (ex.: `issue-14-escalacao-so-na-escalacao`), commitar nela e abrir um PR com `Closes #N`. Não misturar issues na mesma branch nem trabalhar direto no `main`. Isso vale no lugar de "dar push no `main`" quando o trabalho é uma issue.
- **Issues numeradas:** o título começa com o número sequencial da issue, no formato `N. Título` (ex.: `5. Adicionar Copa do Brasil`). O número é o próximo do repositório: ver o último com `gh issue list --repo BeVieira07/Boleiro-Manager --state all --limit 1` e somar 1. Ao criar várias de uma vez, numerar em sequência. As #1 a #4 foram criadas antes desta regra e estão sem número no título.
- Issues abertas: #1 empréstimo de jogadores, #2 escalar o time, #3 estilos de jogo e modo ataque/defesa, #4 posições detalhadas (zagueiro/lateral, volante/meia). A #4 é base da #2 e da #3.

## Onde ficam os dados (já persistidos no git)
| O quê | Onde |
|---|---|
| Clubes e jogadores (2.435 jogadores, 80 clubes) | `data/brasileirao-2024.json` (Série A), `data/brasileirao-serie-{b,c,d}-2024.json` |
| Notas reais para calibrar o overall | `data/notas-2024.json` |
| Overalls escolhidos à mão (`ovrM`, valem mais que tudo) | `data/overalls-manual.json` |
| Escudos | `img/escudos/<id>.png` |
| Origem de cada escudo (para conferir) | `data/escudos-fontes.json` |
| Título do artigo da Wikipédia de cada clube | `data/escudos-wikipedia.json` |
| O que o jogo lê | `js/dados-padrao.js` (**gerado**, não editar à mão) |

`data/*-raw.json` é ignorado pelo git.

## Fluxo para mudar dados
1. Jogadores/times novos: `npm run dados` (ou `dados:b`, `dados:c`, `dados:d`) e `npm run notas`.
2. Overall à mão: editar `data/overalls-manual.json`.
3. Escudos: `npm run escudos`.
4. Mudou a temporada ou o clube trocou de divisão: conferir as listas na Wikipédia (`Campeonato Brasileiro de Futebol de AAAA - Série A/B/C/D`), editar os ids em `data/divisoes-2026.json` e rodar `node scripts/aplicar-divisoes-2026.mjs` (move os clubes entre os 4 JSONs; exige 20 por série e que todo id exista). Clube que não existe nos dados precisa ser baixado pela API antes; sem API, deixar um clube antigo no lugar e registrar em `_divergencias`.
5. **Sempre** terminar com `npm run dados:padrao` (regenera `js/dados-padrao.js`), conferir e commitar.

## API-Football
- A conta está **suspensa** ("Your account is suspended"), então `dados`, `dados:b/c/d` e `notas` não baixam nada novo. Os dados já salvos em `data/` continuam valendo.
- O host de imagens `media.api-sports.io` está fora do ar (DNS não resolve). Por isso os escudos vêm da Wikipédia.

## Escudos
- `npm run escudos` baixa a imagem principal do artigo `pt.wikipedia.org` de cada clube (mapa em `data/escudos-wikipedia.json`) para `img/escudos/<id>.png`, 128 px. Pula os que já existem; apague o arquivo para baixar de novo.
- A Wikipédia limita o ritmo (HTTP 429). O script já faz pausa e tenta de novo; se ainda falhar, esperar alguns minutos.
- `gerar-dados-padrao.mjs` aponta o `logo` para o arquivo local quando ele existe; sem arquivo, mantém o link da API.
- Se a imagem falhar no navegador, `crest()` em `js/partida.js` troca pela sigla colorida.
- Falta o escudo do **Iguatu** (`c15505`): sem imagem na Wikipédia. Salvar como `img/escudos/c15505.png` e rodar `npm run dados:padrao`.

## Rodando o jogo
- Abrir `index.html` direto do disco (`file://`) funciona. Não há porta.
- Com porta: `npm start` (`npx serve .`, normalmente `http://localhost:3000`) ou Live Server do VS Code (`http://127.0.0.1:5500`).
- O `localStorage` é separado por origem: save feito em `file://` não aparece em `localhost`. Para mudar de origem, usar **Exportar save** e **Importar save** na aba **Dados**.

## Testes
- `npm test` roda `node --test` com os testes de `tests/` (uns 20 s). Rodar antes de commitar mudanças no jogo.
- `tests/jogo.mjs` carrega os scripts de `js/` em Node, na ordem do `index.html`, com um DOM falso: `carregarJogo()` devolve `run(código)`, o HTML da tela atual, os alertas e o localStorage em memória. Use `jogarRodada`/`jogarTemporada` (corrigem a escalação quando há lesionados) e `problemasNasTelas` (acha "undefined", "NaN" e "[object" nas telas).
- Sorteio com semente (#26): as regras usam `rnd()` (`utils.js`), que avança `S.rng`; cada rodada recomeça de `semente(S.seed, temporada, rodada)`. Nunca usar `Math.random` nas regras (há um teste que confere). `jogarTemporada` impede a demissão, salvo com `{demissao:true}`.

## Persistência no navegador
- As campanhas ficam em `localStorage`, uma por save (até 5): `brasfoot_save_v2_<id>` mais o índice `brasfoot_saves_v2`. Tudo em `js/saves.js` (`save()` de `js/estado.js` chama `salvarJogo()`). O jogo abre na tela inicial (Continuar, Novo jogo, lista de saves); o save antigo de slot único (`brasfoot_save_v1`) é migrado na primeira abertura. Backup: **Exportar save (JSON)**; importar cria um save novo.
- Dados importados pela aba Dados (`DATA_KEY`) ficam só no navegador e **têm prioridade** sobre `dados-padrao.js`. Se o jogo mostrar menos jogadores ou escudos antigos: aba **Dados**, **Voltar aos dados padrão**, `Ctrl+F5` e começar campanha nova (dados novos só valem a partir de um jogo novo).
- Para guardar algo importado pela aba Dados: **Exportar dados**, salvar em `data/` e rodar `npm run dados:padrao`.
- O overall é recalculado a cada campanha nova (`rate()` em `js/dados.js`), exceto os `ovrM`.

## Mapa do código (`js/`)
`utils.js` (store, `esc`) · `estado.js` (estado `S`, divisões, `newGame`) · `dados.js` (`rate`, dados de reserva) · `dados-padrao.js` (gerado) · `motor.js` (simulação) · `partida.js` (jogo ao vivo, `crest`) · `mercado.js` · `telas.js` (telas e abas) · `api.js` (importar/exportar) · `main.js`.

## Posições detalhadas (#4)
- `p.pos` continua sendo o grupo (G/D/M/A); `p.pd` é a posição detalhada (GOL, ZAG, LD, LE, VOL, MC meia central, MEI meia-atacante, PE e PD pontas, ATA centroavante; antes da #23 eram MEI, MAT, PON, CEN. Saves e dados antigos são convertidos por `converterPosicoesAntigas`, marcados com `posv:2`) e `p.ps` as secundárias. Tudo em `js/posicoes.js`.
- A API só traz o grupo. As posições reais vêm do Transfermarkt (#10): `npm run posicoes` baixa o elenco detalhado de cada clube para `data/posicoes-2024.json` (retomável, com pausa entre pedidos; os clubes que não casam por nome entram em `data/posicoes-clubes.json` como `"<id do jogo>": <id do Transfermarkt>`). O elenco baixado é o ATUAL (`--saison=2025`), porque a API devolve o elenco atual.
- `npm run dados:padrao` aplica, nesta ordem: `data/posicoes-manual.json` (à mão: `"Clube": {"Nome": "ZAG"}`, com secundárias opcionais, ex.: `"LD LE"`), as posições reais do Transfermarkt e, só para quem sobrar, a inferência pela camisa e pelo equilíbrio do elenco. Quem ficou na inferência está em `data/posicoes-pendentes.json`. Se a posição real mudar o grupo, `p.pos` acompanha. Saves e dados antigos são migrados no carregamento (`migrarPosicoes`).
- Para escalar: `penalidadePosicao(p, slot)` devolve `{pen, tipo, aviso}` e `ovrNaPosicao(p, slot)` o overall já penalizado.
