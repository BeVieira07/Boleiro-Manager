import { esc } from '../core/utils.mjs';
import { S, tec, tecnicos, usarTecnico, userClub } from '../core/estado.mjs';
import { autoXI, confirmarRodada, jogarRodada, validateLineup } from '../core/motor.mjs';
import { demissao } from './diretoria.mjs';
import { save, ui } from './estado.mjs';
import { seasonEnd, showLive } from './partida.mjs';
import { render } from './telas.mjs';

export function playRound(aoVivo=true){
  const r=jogarRodada();
  if(r.demitido){demissao();return}
  if(r.fim)return;
  if(r.erro){if(r.tecnico)usarTecnico(r.tecnico);alert(r.erro);ui.view=r.faltam?'clube':'escalacao';render();return}
  const games=r.jogos,mine=r.meu;
  ui.lastRound={round:S.round,games};
  save();
  if(mine&&aoVivo)showLive(mine,()=>{ui.view='rodada';render();if(S.round>=S.fixtures.length)seasonEnd();if(tec().demitido)demissao()});
  else if(aoVivo){ui.view='rodada';render();if(tec().demitido)demissao()}
}
export function simToEnd(){
  if(!confirm('Simular todas as rodadas restantes sem assistir aos jogos?'))return;
  while(S.round<S.fixtures.length&&!tec().demitido){
    const err=validateLineup();if(err){userClub().lineup=autoXI(userClub())}
    playRound(false);
  }
  ui.view='tabela';render();seasonEnd();if(tec().demitido)demissao();
}

// revezamento: confirma a vez do técnico atual; quando todos confirmaram, joga a rodada
export function confirmarVez(){
  const r=confirmarRodada();
  if(r.erro){alert(r.erro);ui.view='escalacao';render();return}
  if(r.todos){playRound();return}
  save();ui.view='clube';render();alert(`Vez de ${r.proximo.nome}. Passe o computador!`);
}
// botão da rodada: no solo joga direto; com vários técnicos, cada um confirma a sua vez
export function botaoRodada(cls,txt){
  if(tecnicos().length>1)return `<button class="${cls}" data-acao="confirmarVez">✔ Confirmar rodada ${S.round+1} — ${esc(tec().nome)}</button>`;
  return `<button class="${cls}" data-acao="playRound">${txt}</button>`;
}
