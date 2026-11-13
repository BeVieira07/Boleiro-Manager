import { S, tec, userClub } from '../core/estado.mjs';
import { autoXI, jogarRodada, validateLineup } from '../core/motor.mjs';
import { demissao } from './diretoria.mjs';
import { save, ui } from './estado.mjs';
import { seasonEnd, showLive } from './partida.mjs';
import { render } from './telas.mjs';

export function playRound(aoVivo=true){
  const r=jogarRodada();
  if(r.demitido){demissao();return}
  if(r.fim)return;
  if(r.erro){alert(r.erro);ui.view='escalacao';render();return}
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
