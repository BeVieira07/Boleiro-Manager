import { faixaConf } from '../core/diretoria.mjs';
import { S, usarEstado, userClub } from '../core/estado.mjs';
import { esc } from '../core/utils.mjs';
import { exportSave } from './api.mjs';
import { save } from './estado.mjs';
import { closeModal, openModal } from './partida.mjs';
import { apagarSave, novoJogo } from './saves.mjs';

export function demissao(){
  openModal(`<h2>🔥 Você foi demitido</h2><p>A diretoria do ${esc(userClub().name)} perdeu a confiança (${S.conf}/100) e encerrou seu contrato.</p>
   <div class="row" style="justify-content:flex-end"><button class="btn sec" data-acao="exportSave">Exportar save</button><button class="btn" data-acao="recomecarAposDemissao">Escolher outro clube</button></div>`);
}
export function painelDiretoria(){
  const c=S.conf,cor=c>=55?'var(--ok,#3a3)':c>=30?'var(--warn,#e90)':'var(--danger,#d33)';
  return `<div class="card"><h3>Diretoria</h3>
   <div class="row"><b style="font-size:22px">${Math.round(c)}</b><span class="pill">${faixaConf(c)}</span><span class="muted">Meta: ${esc(S.meta.texto)} (até o ${S.meta.alvo}º)</span></div>
   <div class="bar"><div style="width:${c}%;background:${cor}"></div></div>
   ${S.confFat&&S.confFat.length?`<p class="muted">Última rodada: ${S.confFat.map(f=>`${esc(f.t)} <b class="${f.v>0?'ok':'bad'}">${f.v>0?'+':''}${f.v}</b>`).join(' · ')}</p>`:''}</div>`;
}

export function recomecarAposDemissao(){closeModal();apagarSave(S.saveId);usarEstado(null);novoJogo()}
