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

O jogo já vem com a **Série A 2024** (20 clubes, 726 jogadores reais) em `data/brasileirao-2024.json`, embutida em `js/dados-padrao.js` para funcionar até abrindo o HTML direto. Para usar outros dados, baixe com os passos abaixo e carregue em **Dados → Carregar JSON**.

1. Copie `.env.example` para `.env` e coloque sua chave.
2. Rode:
   ```bash
   npm run dados
   ```
3. Serão criados:
   - `data/brasileirao-2026.json` → formato do jogo (no jogo: **Dados → Carregar JSON**)
   - `data/brasileirao-2026-raw.json` → respostas brutas da API

No plano gratuito a temporada 2026 é bloqueada; o script monta os 20 clubes de 2026 com os **elencos atuais** (`/players/squads`, que não depende de temporada). Também é possível importar pelo próprio jogo, na tela **Dados**.

> O `.env` está no `.gitignore` — nunca suba sua chave para o GitHub.

## Estrutura

```
index.html            página principal
css/style.css         visual
js/utils.js           utilidades (aleatório, formatação, localStorage)
js/dados.js           clubes base, geração de jogadores, força e valor
js/dados-padrao.js    dados padrão (Série A 2024), gerado de data/brasileirao-2024.json
js/estado.js          estado do jogo, novo jogo, calendário e tabela
js/motor.js           escalação, força dos times, simulação e rodada
js/partida.js         jogo ao vivo e fim de temporada
js/mercado.js         compra, venda e propostas
js/api.js             importação da API-Football, exportar/importar JSON e save
js/telas.js           todas as telas (HTML gerado em JS)
js/main.js            inicialização
scripts/baixar-brasileirao.mjs   script Node para baixar os dados
data/                 JSONs baixados
```

Os arquivos JS são scripts comuns carregados em ordem (sem build). As funções são globais porque os botões usam `onclick="..."`.

## Salvamento

O progresso fica no `localStorage` do navegador. Use **Dados → Exportar save** para fazer backup em JSON.

> Atenção: o `localStorage` é separado por endereço. Um jogo salvo abrindo o arquivo direto não aparece no Live Server (e vice-versa) — use Exportar/Importar save para levar.

## Ideias para próximas versões
- Lesões, suspensões e cartões acumulados
- Série B com acesso e rebaixamento
- Campo visual para escalação
- Copa do Brasil / Libertadores
- Contratos e renovação
