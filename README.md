# Brasfoot Web ⚽

Jogo de gerenciamento de futebol no navegador, estilo Brasfoot, com os clubes e elencos do Brasileirão Série A.

## Como rodar

**Opção 1: Live Server (recomendado no VS Code)**
1. Instale a extensão **Live Server** (o VS Code vai sugerir ao abrir a pasta).
2. Clique com o botão direito em `index.html` → **Open with Live Server**.

**Opção 2: terminal**
```bash
npm start        # abre em http://localhost:3000
```

Abrir o `index.html` direto (duplo clique) também funciona, mas com Live Server a página recarrega sozinha a cada alteração.

## Dados do Brasileirão (API-Football)

O jogo já vem com as **Séries A, B, C e D de 2024** (80 clubes, 2435 jogadores reais), salvas em `data/brasileirao-2024.json` e `data/brasileirao-serie-<b|c|d>-2024.json`. Elas ficam embutidas em `js/dados-padrao.js` para funcionar até abrindo o HTML direto. Se mudar os JSONs, rode `npm run dados:padrao` para gerar o `dados-padrao.js` de novo. Para usar outros dados, baixe com os passos abaixo e carregue em **Dados → Carregar JSON**.

1. Copie `.env.example` para `.env` e coloque sua chave.
2. Rode:
   ```bash
   npm run dados
   ```
3. Serão criados:
   - `data/brasileirao-2026.json` → formato do jogo (no jogo: **Dados → Carregar JSON**)
   - `data/brasileirao-2026-raw.json` → respostas brutas da API

No plano gratuito a temporada 2026 é bloqueada; o script monta os 20 clubes de 2026 com os **elencos atuais** (`/players/squads`, que não depende de temporada). Também é possível importar pelo próprio jogo, na tela **Dados**.

### Séries B, C e D

O jogo suporta até quatro divisões. Cada série tem sua tabela, e no fim da temporada sobem 4 e caem 4 entre séries vizinhas (A↔B, B↔C, C↔D). Quanto mais baixa a série, menores a cota de TV, a premiação e o caixa inicial. Todas as séries usam pontos corridos com ida e volta, sem as fases de grupos e mata-mata reais.

A Série D real tem 64 clubes. O jogo usa só 20: os que foram mais longe em 2024 (quem avança joga mais partidas). Alguns clubes pequenos vêm com poucos jogadores na API, e o jogo completa o elenco com jogadores gerados.

- **Pelo terminal:** `npm run dados:b`, `dados:c` ou `dados:d` gera `data/brasileirao-serie-<b|c|d>-2024.json`. Depois rode `npm run dados:padrao` para embutir no jogo, ou use **Dados → Carregar JSON** e confirme para juntar com o que já está carregado.
- **Pelo jogo:** na tela **Dados**, escolha a série no importador. A série importada substitui só ela mesma.

As Séries B, C e D precisam de uma temporada liberada pelo plano da API (no plano gratuito, de 2022 a 2024). Jogadores que aparecem em dois elencos (empréstimos) devem ficar só em um clube, porque o `dados:padrao` recusa ids repetidos.

## Overall dos jogadores

A API só entrega nome, idade, posição e camisa, então o overall (40–95) vem de três fontes, em ordem de prioridade:

1. **Lista manual** (`data/overalls-manual.json`): overall escolhido à mão para craques e para quem veio de fora do Brasil (sem nota nas séries nacionais). É um arquivo editável, com valores estimados de memória. Depois de editar, rode `npm run dados:padrao`.
2. **Nota real** (`data/notas-2024.json`): a nota média e os minutos de 2024 de cada jogador, comparados com os outros da mesma série e posição (e, para atacantes e meias, com gols e assistências por 90 min). Quanto mais minutos, mais o jogo confia na nota (confiança total a partir de ~2000 min).
3. **Estimativa:** para quem não tem nota, usa a força do clube em relação à média da série, a idade e um sorteio pequeno. Quem jogou pouco ou nada em 2024 fica mais baixo.

O overall médio de um titular é 72 na Série A, 66 na B, 61 na C e 56 na D.

Para baixar as notas: `npm run notas`. O plano gratuito só libera 100 requisições por dia e 3 páginas por consulta, então a busca é feita clube a clube (~3 requisições cada, ~180 no total para as Séries A, B e C). O script **retoma de onde parou**: rode de novo a cada dia até aparecer "Concluído". Depois rode `npm run dados:padrao` para aplicar. Séries sem nota (como a D) usam só a estimativa.

> O `.env` está no `.gitignore` — nunca suba sua chave para o GitHub.

## Estrutura

```
index.html            página principal
css/style.css         visual
js/utils.js           utilidades (aleatório, formatação, localStorage)
js/dados.js           clubes base, geração de jogadores, força e valor
js/dados-padrao.js    dados padrão (Séries A, B, C e D 2024), gerado por scripts/gerar-dados-padrao.mjs
js/estado.js          estado do jogo, novo jogo, calendário e tabela
js/motor.js           escalação, força dos times, simulação e rodada
js/partida.js         jogo ao vivo e fim de temporada
js/mercado.js         compra, venda e propostas
js/api.js             importação da API-Football, exportar/importar JSON e save
js/telas.js           todas as telas (HTML gerado em JS)
js/main.js            inicialização
scripts/baixar-brasileirao.mjs   script Node para baixar os dados
scripts/baixar-notas.mjs         baixa nota e minutos dos jogadores (retomável)
scripts/gerar-dados-padrao.mjs   junta as séries, aplica notas e lista manual em js/dados-padrao.js
data/                 JSONs baixados
```

Os arquivos JS são scripts comuns carregados em ordem (sem build). As funções são globais porque os botões usam `onclick="..."`.

## Salvamento

O progresso fica no `localStorage` do navegador. Use **Dados → Exportar save** para fazer backup em JSON.

> Atenção: o `localStorage` é separado por endereço. Um jogo salvo abrindo o arquivo direto não aparece no Live Server (e vice-versa) — use Exportar/Importar save para levar.

## Ideias para próximas versões
- Lesões, suspensões e cartões acumulados
- Campo visual para escalação
- Copa do Brasil / Libertadores
- Contratos e renovação
