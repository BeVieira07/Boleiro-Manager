import { faixaConf } from '../core/diretoria.mjs';
import { S, tec, usarEstado, userClub } from '../core/estado.mjs';
import { esc } from '../core/utils.mjs';
import { exportSave } from './api.mjs';
import { save } from './estado.mjs';
import { closeModal, openModal } from './partida.mjs';
import { apagarSave, novoJogo } from './saves.mjs';

export function demissao(){
  openModal(`<h2>🔥 Você foi demitido</h2><p>A diretoria do ${esc(userClub().name)} perdeu a confiança (${tec().conf}/100) e encerrou seu contrato.</p>
   <div class="row" style="justify-content:flex-end"><button class="btn sec" data-acao="exportSave">Exportar save</button><button class="btn" data-acao="recomecarAposDemissao">Escolher outro clube</button></div>`);
}

export function recomecarAposDemissao(){closeModal();apagarSave(S.saveId);usarEstado(null);novoJogo()}
