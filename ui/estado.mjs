import { sampleData } from '../core/dados.mjs';
import { DADOS_PADRAO } from '../core/dados-padrao.mjs';
import { S, criarJogo } from '../core/estado.mjs';
import { podeCriarSave, salvarJogo } from './saves.mjs';
import { render } from './telas.mjs';
import { DATA_KEY, store } from './utils.mjs';

// estado só da tela (não vai para o save)
export const ui={view:'clube',lastRound:null,selEsc:null,vDiv:null,jogosRound:null,mf:{pos:'',q:'',max:'',club:''},tvAoVivo:null};
export function save(){if(S)salvarJogo()} // js/saves.js: grava no save da campanha atual
export function getData(){return store.get(DATA_KEY)||(typeof DADOS_PADRAO!=='undefined'?DADOS_PADRAO:sampleData())}

export function newGame(clubId){if(!podeCriarSave())return;criarJogo(clubId,getData());save();ui.view='clube';render()}
