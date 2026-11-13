---
name: boleiro-manager
description: Como o Boleiro-Manager guarda e atualiza jogadores, times, overalls e escudos, como rodar o jogo, e as regras de trabalho do projeto (issues, commits, idioma). Use ao mexer em dados, escudos, saves ou ao abrir issues.
---

# Boleiro-Manager

Manager de futebol estilo Brasfoot, em JS puro, sem build. Brasileirão Séries A, B, C e D de 2024 (dados da API-Football). Responder sempre em **PT-BR**.

## Regras de trabalho
- Repositório: `BeVieira07/Boleiro-Manager`. Usar a conta **BeVieira07** (o `gh` tem outras contas logadas).
- Commitar e dar push no `main` com a BeVieira07, **sem** `Co-Authored-By` do Claude.
- Issues: criar com `gh issue create --repo BeVieira07/Boleiro-Manager`, com título curto, descrição (contexto, proposta, critérios de aceite) e labels (ver "Labels" abaixo). Mostrar o rascunho antes de criar, salvo quando o pedido já for explícito. Tarefas independentes viram issues separadas.
- **Uma branch por issue:** ao resolver uma issue, criar a branch a partir do `main` atualizado, com o nome `issue-N-resumo-curto` (ex.: `issue-14-escalacao-so-na-escalacao`), commitar nela e abrir um PR com `Closes #N`. Não misturar issues na mesma branch nem trabalhar direto no `main`. Isso vale no lugar de "dar push no `main`" quando o trabalho é uma issue.
- **Labels:** uma de tipo e, se couber, uma ou duas de área. Tipo: `bug` (algo errado), `enhancement` (funcionalidade nova que não cabe numa área abaixo), `documentation`, `refatoração` (reorganizar sem mudar o comportamento), `limpeza` (remover código morto ou duplicado), `testes`, `infra` (scripts, ferramentas, fluxo). Área: `elenco` (jogadores, evolução, posições, base), `economia` (dinheiro, salários, contratos, diretoria), `competições` (campeonatos, copas, calendário), `save` (saves e migração), `dados` (jogadores, clubes, escudos, scripts de dados), `segurança`. Se faltar uma label, criar com `gh label create` e acrescentar aqui.
- **Commits:** a mensagem começa com a tag do tipo e dois pontos, em português, e termina com o número da issue quando houver: `feat:` (funcionalidade), `fix:` (correção), `refactor:`, `docs:`, `test:`, `dados:` (dados, escudos, posições geradas), `chore:` (ferramentas e skill). Ex.: `feat: confiança da diretoria (#11)`, `fix: bicho por vitória com empréstimos (#43)`. Os commits antigos não seguem isso e não precisam ser reescritos.
- **Issues numeradas:** o título começa com o número sequencial da issue, no formato `N. Título` (ex.: `5. Adicionar Copa do Brasil`). O número é o próximo do repositório, e issues e PRs dividem o mesmo contador: pegar o maior com `gh api "repos/BeVieira07/Boleiro-Manager/issues?state=all&per_page=1" -q ".[0].number"` e somar 1. Outras sessões também criam issues e PRs, então conferir o número real depois de criar e corrigir o título se ele tiver andado. Ao criar várias de uma vez, numerar em sequência. As #1 a #4 foram criadas antes desta regra e estão sem número no título.
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
| O que o jogo lê | `core/dados-padrao.mjs` (**gerado**, não editar à mão) |

`data/*-raw.json` é ignorado pelo git.

## Fluxo para mudar dados
1. Jogadores/times novos: `npm run dados` (ou `dados:b`, `dados:c`, `dados:d`) e `npm run notas`.
2. Overall à mão: editar `data/overalls-manual.json`.
3. Escudos: `npm run escudos`.
4. Mudou a temporada ou o clube trocou de divisão: conferir as listas na Wikipédia (`Campeonato Brasileiro de Futebol de AAAA - Série A/B/C/D`), editar os ids em `data/divisoes-2026.json` e rodar `node scripts/aplicar-divisoes-2026.mjs` (move os clubes entre os 4 JSONs; exige 20 por série e que todo id exista). Clube que não existe nos dados precisa ser baixado pela API antes; sem API, deixar um clube antigo no lugar e registrar em `_divergencias`.
5. **Sempre** terminar com `npm run dados:padrao` (regenera `core/dados-padrao.mjs`), conferir e commitar.

## API-Football
- A conta está **suspensa** ("Your account is suspended"), então `dados`, `dados:b/c/d` e `notas` não baixam nada novo. Os dados já salvos em `data/` continuam valendo.
- O navegador não importa mais da API (#52): a aba Dados só carrega e exporta JSON. A única fonte são os scripts (`npm run dados` etc.).
- O host de imagens `media.api-sports.io` está fora do ar (DNS não resolve). Por isso os escudos vêm da Wikipédia.

## Escudos
- `npm run escudos` baixa a imagem principal do artigo `pt.wikipedia.org` de cada clube (mapa em `data/escudos-wikipedia.json`) para `img/escudos/<id>.png`, 128 px. Pula os que já existem; apague o arquivo para baixar de novo.
- A Wikipédia limita o ritmo (HTTP 429). O script já faz pausa e tenta de novo; se ainda falhar, esperar alguns minutos.
- `gerar-dados-padrao.mjs` aponta o `logo` para o arquivo local quando ele existe; sem arquivo, mantém o link da API.
- Se a imagem falhar no navegador, `crest()` em `ui/partida.mjs` troca pela sigla colorida.
- Falta o escudo do **Iguatu** (`c15505`): sem imagem na Wikipédia. Salvar como `img/escudos/c15505.png` e rodar `npm run dados:padrao`.

## Rodando o jogo
- O jogo usa módulos ES: **precisa de servidor local**. Abrir `index.html` direto do disco (`file://`) não funciona.
- Com porta: `npm start` (`npx serve .`, normalmente `http://localhost:3000`) ou Live Server do VS Code (`http://127.0.0.1:5500`).
- O `localStorage` é separado por origem: save feito em `file://` não aparece em `localhost`. Para mudar de origem, usar **Exportar save** e **Importar save** na aba **Dados**.

## Online (#30)
- Site: GitHub Pages, publicado pelo workflow `.github/workflows/pages.yml` a cada push na `main` (roda `npm test` antes). Endereço: https://bevieira07.github.io/Boleiro-Manager/. O site leva só `index.html`, `css/`, `img/`, `core/` e `ui/`.
- Supabase: `ui/config.mjs` (URL e chave **pública**; vazio = offline, sem login), `ui/conta.mjs` (login por link mágico, `supabase-js` da CDN com versão fixa), `supabase/migrations/*.sql` (tabelas e RLS, aplicadas com `npx supabase db push`). A chave service_role/secret **nunca** entra no repositório (`tests/conta.test.mjs` confere).
- Configurar: veja "Online (Supabase)" no README. O plano gratuito pausa o projeto após cerca de uma semana sem uso (dados ficam; reativar no painel).
- Nos testes, `configurarConta({url, chave, cliente})` troca o Supabase por um cliente falso.
- Projeto Supabase: ref `nfctxdzapspnxwttrwym` (sa-east-1, plano free). As migrações podem ser aplicadas pelo MCP do Supabase (`apply_migration`), além do `db push`. Aplicada pelo MCP, a migração ganha como versão o horário em que rodou: renomear o arquivo para essa versão (`list_migrations`), senão o `db push` tenta rodá-la de novo. Testes das regras de acesso no banco real: `supabase/tests/*.sql` (transação com rollback; rodar no SQL Editor ou com `execute_sql`).
- Saves na nuvem (#31): `ui/nuvem.mjs`. Logado, `salvarJogo()` agenda o envio (`agendarEnvio`, junta envios em 2 s) para a tabela `saves` (chave `user_id, id` = `S.saveId`). No índice local, `x.nuvem` = data da versão já enviada; diferente de `x.data` = pendente (`pendente(x)`), reenviado ao entrar, ao abrir o jogo e no evento `online`. A tela inicial mistura os saves locais e os da nuvem (`savesNuvem()`, só o resumo; `abrirDaNuvem` baixa o estado). Logado não há limite de 5; se o navegador enche, `liberarEspaco()` apaga as cópias locais já enviadas.
- Ligas (#32): `ui/liga.mjs` (telas `ligas` e `lobby`, botão "Ligas com amigos" no menu só para quem está logado). Ações pelas funções do banco `criar_liga`, `entrar_liga`, `escolher_clube` (migração `..._ligas_funcoes.sql`); as tabelas da liga só são lidas pelo navegador. O estado da liga é criado e jogado, e o mercado com a IA é resolvido (#35, `acao: 'mercado'`), pela função `jogar-rodada` (#34, veja `supabase/functions/README.md`; **publicar de novo quando `core/` mudar**); na tela, `ui/ligajogo.mjs` (teste com Supabase falso: `tests/liga-jogo.test.mjs`). Teste das regras no banco real: `supabase/tests/rls_ligas.sql`.
- `tests/jogo.mjs` importa os módulos um de cada vez: em paralelo, os ciclos entre módulos de `ui/` quebram no Node 22.

## Front (#56–#65)
- Visual da maquete do front (tema escuro verde): tokens e componentes em `css/style.css`, documentados em `docs/front.md` (leia antes de mexer em tela). Ícones SVG em `ui/icones.mjs` (`icone(nome)`), nada de emoji nas telas.
- Layout: menu lateral/barra inferior e barra de ações em `ui/layout.mjs`; cada tela do jogo tem título em `TITULOS`.
- Mensagens: `avisar(msg, tipo)`, `confirmar({...}, sim)` e `pedirValor({...}, enviar)` de `ui/avisos.mjs`. **Nunca** `alert`, `confirm` ou `prompt` (há teste). Nos testes, as mensagens vão para `j.alertas` e as confirmações respondem "sim".
- Testes de front: contraste dos tokens (`tests/contraste.test.mjs`), classes sem uso e telas (`tests/telas.test.mjs`), acessibilidade (`tests/acessibilidade.test.mjs`).

## Testes
- `npm test` roda `node --test` com os testes de `tests/` (uns 20 s). Rodar antes de commitar mudanças no jogo.
- `tests/jogo.mjs` importa os módulos de `core/` e `ui/` em Node com um DOM falso: `carregarJogo()` zera o estado e devolve `run(código)` (com todos os exports à vista), `acao('nome|arg')` (clica como o botão), o HTML da tela atual, os alertas e o localStorage em memória. Para trocar o jogo use `usarEstado(...)`. Use `jogarRodada`/`jogarTemporada` (corrigem a escalação quando há lesionados) e `problemasNasTelas` (acha "undefined", "NaN" e "[object" nas telas).
- Sorteio com semente (#26): as regras usam `rnd()` (`utils.js`), que avança `S.rng`; cada rodada recomeça de `semente(S.seed, temporada, rodada)`. Nunca usar `Math.random` nas regras (há um teste que confere). `jogarTemporada` impede a demissão, salvo com `{demissao:true}`.

## Persistência no navegador
- As campanhas ficam em `localStorage`, uma por save (até 5): `brasfoot_save_v2_<id>` mais o índice `brasfoot_saves_v2`. Tudo em `ui/saves.mjs` (`save()` de `core/estado.mjs` chama `salvarJogo()`). O jogo abre na tela inicial (Continuar, Novo jogo, lista de saves); o save antigo de slot único (`brasfoot_save_v1`) é migrado na primeira abertura. Backup: **Exportar save (JSON)**; importar cria um save novo.
- Dados importados pela aba Dados (`DATA_KEY`) ficam só no navegador e **têm prioridade** sobre `dados-padrao.js`. Se o jogo mostrar menos jogadores ou escudos antigos: aba **Dados**, **Voltar aos dados padrão**, `Ctrl+F5` e começar campanha nova (dados novos só valem a partir de um jogo novo).
- Para guardar algo importado pela aba Dados: **Exportar dados**, salvar em `data/` e rodar `npm run dados:padrao`.
- O overall é recalculado a cada campanha nova (`rate()` em `core/dados.mjs`), exceto os `ovrM`.

## Mapa do código
- `core/`: regras puras (sem DOM, `alert`, `render` nem `localStorage`), testado em `tests/modulos.test.mjs`. O estado atual é `S` em `core/estado.mjs`; de fora, troque com `usarEstado(s)`. As regras devolvem `{erro}` / `{ok, msg}`.
- `ui/`: telas. Estado só da tela em `ui.view`, `ui.vDiv` etc. (`ui/estado.mjs`). Botões: `data-acao="função|arg"` e `data-mudar="função|arg"` (recebe valor e evento), ligados em `ui/main.mjs`; a função precisa ser exportada por um módulo de `ui/`.
- Imports são explícitos: ao usar uma função de outro módulo, importe-a.
- Técnicos (#28): `S.managers[id]` = {nome, clubId, conf, meta, confBaixa, confFat, demitido, news, offers}; `S.atual` é o técnico da vez (solo: `local`). `tec()`, `tecnicos()`, `userClub()` (clube do técnico da vez), `clubDo(t)`, `ehHumano(c)`, `usarTecnico(id)`. Caixa e finanças são do clube (`c.balance`, `c.fin`). `addNews(texto, clubeId?)` vai para o técnico daquele clube; `addNewsTodos` para todos. Saves antigos são migrados em `reindex()`.
- Revezamento (#29): com mais de um técnico, `jogarRodada()` exige que todos tenham `pronto`; `confirmarRodada()` (core) marca o técnico da vez e passa a vez ao próximo; na tela, `confirmarVez` e `botaoRodada()`. Novo jogo com vários técnicos: `ui.novos` + `adicionarTecnico` / `comecarComTecnicos` (até 4). Nos testes, `j.campo(id, valor)` define o valor de um campo de formulário.

## Posições detalhadas (#4)
- `p.pos` continua sendo o grupo (G/D/M/A); `p.pd` é a posição detalhada (GOL, ZAG, LD, LE, VOL, MC meia central, MEI meia-atacante, PE e PD pontas, ATA centroavante; antes da #23 eram MEI, MAT, PON, CEN. Saves e dados antigos são convertidos por `converterPosicoesAntigas`, marcados com `posv:2`) e `p.ps` as secundárias. Tudo em `core/posicoes.mjs`.
- A API só traz o grupo. As posições reais vêm do Transfermarkt (#10): `npm run posicoes` baixa o elenco detalhado de cada clube para `data/posicoes-2024.json` (retomável, com pausa entre pedidos; os clubes que não casam por nome entram em `data/posicoes-clubes.json` como `"<id do jogo>": <id do Transfermarkt>`). O elenco baixado é o ATUAL (`--saison=2025`), porque a API devolve o elenco atual.
- `npm run dados:padrao` aplica, nesta ordem: `data/posicoes-manual.json` (à mão: `"Clube": {"Nome": "ZAG"}`, com secundárias opcionais, ex.: `"LD LE"`), as posições reais do Transfermarkt e, só para quem sobrar, a inferência pela camisa e pelo equilíbrio do elenco. Quem ficou na inferência está em `data/posicoes-pendentes.json`. Se a posição real mudar o grupo, `p.pos` acompanha. Saves e dados antigos são migrados no carregamento (`migrarPosicoes`).
- Para escalar: `penalidadePosicao(p, slot)` devolve `{pen, tipo, aviso}` e `ovrNaPosicao(p, slot)` o overall já penalizado.
