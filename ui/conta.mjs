/* ================= conta online (Supabase) (#30) =================
   Login por link mágico no e-mail. Só aparece quando ui/config.mjs tem a URL e a chave pública.
   Sem configuração, ou sem internet, o jogo continua offline como sempre. */
import { esc } from '../core/utils.mjs';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.mjs';

// supabase-js vem de CDN (o jogo não tem build); versão fixa
export const SUPABASE_JS = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';
const conta = { cliente: null, usuario: null, perfil: null, erro: null, config: { url: SUPABASE_URL, chave: SUPABASE_ANON_KEY }, aoMudar: null };

export const onlineConfigurado = () => !!(conta.config.url && conta.config.chave);
export const usuarioAtual = () => conta.usuario;
export const perfilAtual = () => conta.perfil;
/** Cliente do Supabase só quando há alguém logado (para gravar dados da conta). */
export const clienteLogado = () => (conta.usuario ? conta.cliente : null);

/** Para testes: usa outra configuração e/ou um cliente falso no lugar do Supabase. */
export function configurarConta({ url, chave, cliente } = {}) {
  conta.config = { url: url ?? conta.config.url, chave: chave ?? conta.config.chave };
  conta.cliente = cliente ?? null; conta.usuario = null; conta.perfil = null; conta.erro = null;
}

async function cliente() {
  if (!onlineConfigurado()) return null;
  if (!conta.cliente) {
    const { createClient } = await import(SUPABASE_JS);
    conta.cliente = createClient(conta.config.url, conta.config.chave);
  }
  return conta.cliente;
}

async function carregarPerfil() {
  conta.perfil = null;
  if (!conta.usuario) return;
  const { data } = await conta.cliente.from('profiles').select('nome').eq('id', conta.usuario.id).maybeSingle();
  conta.perfil = data || null;
}

/** Abre a sessão (inclusive a que volta do link mágico) e avisa a tela quando o login muda. */
export async function iniciarConta(aoMudar) {
  conta.aoMudar = aoMudar || conta.aoMudar;
  try {
    const c = await cliente(); if (!c) return;
    const { data } = await c.auth.getSession();
    conta.usuario = data.session?.user ?? null;
    await carregarPerfil();
    c.auth.onAuthStateChange(async (_evento, sessao) => {
      conta.usuario = sessao?.user ?? null; await carregarPerfil(); conta.aoMudar && conta.aoMudar();
    });
  } catch (e) { conta.erro = 'Não foi possível conectar ao servidor. O jogo continua offline.'; console.error(e) }
  conta.aoMudar && conta.aoMudar();
}

/** Entra (ou cria a conta) mandando um link mágico para o e-mail. */
export async function entrar() {
  const campo = document.getElementById('emailConta'), email = (campo && campo.value || '').trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { alert('Digite um e-mail válido.'); return }
  const c = await cliente(); if (!c) return;
  const volta = typeof location !== 'undefined' ? location.origin + location.pathname : undefined;
  const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: volta } });
  if (error) { alert('Não foi possível enviar o link: ' + error.message); return }
  alert(`Enviamos um link de acesso para ${email}. Abra o e-mail neste aparelho para entrar.`);
}

export async function sair() {
  const c = await cliente(); if (!c) return;
  await c.auth.signOut();
  conta.usuario = null; conta.perfil = null;
  conta.aoMudar && conta.aoMudar();
}

/** Muda o nome do técnico (tabela profiles). */
export async function mudarNomeTecnico() {
  const campo = document.getElementById('nomeConta'), nome = (campo && campo.value || '').trim();
  if (!nome || !conta.usuario) return;
  const { error } = await conta.cliente.from('profiles').update({ nome }).eq('id', conta.usuario.id);
  if (error) { alert('Não foi possível salvar o nome: ' + error.message); return }
  conta.perfil = { ...(conta.perfil || {}), nome };
  conta.aoMudar && conta.aoMudar();
}

/** Quadro da conta na tela inicial. Vazio quando o online não está configurado. */
export function painelConta() {
  if (!onlineConfigurado()) return '';
  if (conta.erro) return `<div class="card"><p class="muted">${esc(conta.erro)}</p></div>`;
  const u = conta.usuario;
  if (u) return `<div class="card row"><span>Conectado como <b>${esc(conta.perfil?.nome || u.email)}</b> <span class="muted">${esc(u.email)}</span></span>
    <input id="nomeConta" placeholder="Nome do técnico" value="${esc(conta.perfil?.nome || '')}" style="width:180px"><button class="btn sec sm" data-acao="mudarNomeTecnico">Salvar nome</button>
    <button class="btn sec sm" data-acao="sair">Sair</button></div>`;
  return `<div class="card row"><span>Jogar online: entre com seu e-mail (você recebe um link de acesso, sem senha).</span>
    <input id="emailConta" type="email" placeholder="seu@email.com" style="width:220px"><button class="btn sm" data-acao="entrar">Entrar</button></div>`;
}
