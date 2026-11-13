import { P, S, clubById, userClub } from '../core/estado.mjs';
import { aceitarOferta, alternarVenda, podeProporCompra, proporCompra, recusarOferta, valorVendaRapida, venderJa } from '../core/mercado.mjs';
import { posDNome } from '../core/posicoes.mjs';
import { money } from '../core/utils.mjs';
import { save } from './estado.mjs';
import { render } from './telas.mjs';

export function makeBid(pid){
  const p=P[pid],seller=clubById(p.clubId);
  const e=podeProporCompra(pid);if(e){alert(e);return}
  const s=prompt(`Proposta por ${p.name} (${posDNome(p)}, ${p.ovr}) do ${seller.name}.\nValor de mercado: ${money(p.value)}.\nSeu caixa: ${money(S.balance)}.\n\nQuanto oferecer (em milhões)?`,p.value.toFixed(1));
  if(s==null)return;
  const r=proporCompra(pid,parseFloat(String(s).replace(',','.')));
  alert(r.erro||r.msg);save();render();
}
// tela
export const feito=r=>{if(r.erro){alert(r.erro);return}save();render()};
export function acceptOffer(oid){feito(aceitarOferta(oid))}
export function rejectOffer(oid){feito(recusarOferta(oid))}
export function quickSell(pid){
  if(userClub().players.length<=16){alert('Seu elenco ficaria pequeno demais (mínimo 16).');return}
  if(!confirm(`Vender ${P[pid].name} agora por ${money(valorVendaRapida(pid))} (70% do valor)?`))return;
  feito(venderJa(pid));
}
export function toggleListed(pid){feito(alternarVenda(pid))}
