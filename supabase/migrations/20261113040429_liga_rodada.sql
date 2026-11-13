-- #34: rodada da liga jogada no servidor.
-- ligas.rodada = quantas rodadas a liga já jogou (só cresce, inclusive entre temporadas); as entradas de cada técnico
-- valem para esse número. ligas.versao muda a cada gravação do estado.
-- As duas funções abaixo são as únicas que gravam o estado, e só a função do servidor (chave de serviço) as chama.

-- Começa a liga: só se ainda estiver aberta (duas chamadas ao mesmo tempo não criam dois estados).
create function public.liga_iniciar(p_liga uuid, p_estado jsonb) returns boolean
  language plpgsql security definer set search_path = ''
as $$
begin
  update public.ligas set status = 'andamento', rodada = 0, versao = 1 where id = p_liga and status = 'aberta';
  if not found then return false; end if;
  insert into public.liga_estado (liga_id, versao, estado) values (p_liga, 1, p_estado);
  return true;
end;
$$;

-- Grava uma rodada jogada: só se a liga ainda estiver na rodada e versão que o servidor leu.
-- Se outra chamada já gravou, devolve false e não grava nada (a rodada nunca é jogada duas vezes).
create function public.liga_gravar_rodada(p_liga uuid, p_rodada int, p_versao int, p_estado jsonb,
  p_temporada int, p_rodada_temporada int, p_semente bigint, p_jogos jsonb) returns boolean
  language plpgsql security definer set search_path = ''
as $$
begin
  update public.ligas set rodada = rodada + 1, versao = versao + 1
    where id = p_liga and rodada = p_rodada and versao = p_versao and status = 'andamento';
  if not found then return false; end if;
  update public.liga_estado set estado = p_estado, versao = p_versao + 1 where liga_id = p_liga;
  insert into public.liga_resultados (liga_id, temporada, rodada, semente, jogos)
    values (p_liga, p_temporada, p_rodada_temporada, p_semente, p_jogos);
  update public.liga_entradas set pronto = false where liga_id = p_liga;
  return true;
end;
$$;

revoke execute on function public.liga_iniciar(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.liga_gravar_rodada(uuid, int, int, jsonb, int, int, bigint, jsonb) from public, anon, authenticated;
grant execute on function public.liga_iniciar(uuid, jsonb) to service_role;
grant execute on function public.liga_gravar_rodada(uuid, int, int, jsonb, int, int, bigint, jsonb) to service_role;

-- Tempo real: o navegador fica sabendo quem confirmou e quando a rodada foi jogada (as regras de leitura valem aqui também).
alter publication supabase_realtime add table public.ligas, public.liga_entradas;
