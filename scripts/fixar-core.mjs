// Fixa a função jogar-rodada (Supabase) num commit do core/ (#34): troca o commit nos imports do jsDelivr e confere
// se o jsDelivr já serve os arquivos daquele commit. Uso: npm run fixar-core [commit]   (padrão: o HEAD, já no GitHub).
// Depois: publicar a função e fazer o commit da fixação (veja .claude/skills/liga-online/SKILL.md).
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const FUNCAO = new URL('../supabase/functions/jogar-rodada/index.ts', import.meta.url);
const RE = /(cdn\.jsdelivr\.net\/gh\/BeVieira07\/boleiro-manager@)([0-9a-f]{7,40})/g;
export const commitsFixados = texto => [...new Set([...texto.matchAll(RE)].map(m => m[2]))];
export const fixarCommit = (texto, commit) => texto.replace(RE, `$1${commit}`);

async function main() {
  const git = c => execSync(`git ${c}`, { encoding: 'utf8' }).trim();
  const commit = git(`rev-parse ${process.argv[2] || 'HEAD'}`);
  if (!git(`branch -r --contains ${commit}`)) throw new Error(`O commit ${commit.slice(0, 7)} não está no GitHub: faça o push antes.`);
  const texto = readFileSync(FUNCAO, 'utf8'), antes = commitsFixados(texto);
  if (!antes.length) throw new Error('Nenhum import do jsDelivr encontrado em jogar-rodada/index.ts.');
  if (antes.length === 1 && antes[0] === commit) console.log(`Já fixado em ${commit.slice(0, 7)}.`);
  else { writeFileSync(FUNCAO, fixarCommit(texto, commit)); console.log(`Fixado: ${antes.map(c => c.slice(0, 7)).join(', ')} -> ${commit.slice(0, 7)}`) }
  // o jsDelivr pode levar alguns segundos para servir um commit novo
  for (const arq of ['liga.mjs', 'estado.mjs', 'dados-padrao.mjs']) {
    const r = await fetch(`https://cdn.jsdelivr.net/gh/BeVieira07/boleiro-manager@${commit}/core/${arq}`, { method: 'HEAD' });
    console.log(`jsDelivr core/${arq}: ${r.ok ? 'ok' : 'HTTP ' + r.status + ' (espere um pouco e rode de novo)'}`);
  }
  console.log('Próximo: publicar a função (MCP deploy_edge_function, ou npx supabase functions deploy jogar-rodada --project-ref nfctxdzapspnxwttrwym),\nconferir que responde 401 sem login e fazer o commit desta fixação.');
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.error(e.message); process.exit(1) });
