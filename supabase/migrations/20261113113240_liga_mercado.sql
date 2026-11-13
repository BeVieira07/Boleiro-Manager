-- #35: ação de mercado da liga gravada pelo servidor (a resposta da IA é sorteada lá, então recarregar a página não muda nada).
-- Só grava se a versão ainda for a que o servidor leu; senão devolve false e o servidor refaz a ação com o estado novo.
-- Muda ligas.versao: a rodada (liga_gravar_rodada) que leu a versão antiga falha e é refeita, nunca grava por cima.
create function public.liga_gravar_acao(p_liga uuid, p_versao int, p_estado jsonb) returns boolean
  language plpgsql security definer set search_path = ''
as $$
begin
  update public.ligas set versao = versao + 1 where id = p_liga and versao = p_versao and status = 'andamento';
  if not found then return false; end if;
  update public.liga_estado set estado = p_estado, versao = p_versao + 1 where liga_id = p_liga;
  return true;
end;
$$;

revoke execute on function public.liga_gravar_acao(uuid, int, jsonb) from public, anon, authenticated;
grant execute on function public.liga_gravar_acao(uuid, int, jsonb) to service_role;
