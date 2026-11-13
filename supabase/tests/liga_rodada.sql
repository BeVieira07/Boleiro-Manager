-- #34: a rodada nunca é gravada duas vezes, e só o servidor grava (rollback no fim, não deixa rastro).
begin;
insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'teste-a@exemplo.com');
create temp table t (liga uuid);
grant all on t to authenticated, service_role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into t select id from public.criar_liga('Liga teste', array['A'], 'c118');
-- usuário logado não consegue gravar estado nem rodada
do $$ begin
  begin perform public.liga_iniciar((select liga from t), '{}'); raise exception 'usuário iniciou a liga direto';
  exception when insufficient_privilege then null; end;
  begin perform public.liga_gravar_rodada((select liga from t), 0, 1, '{}', 2024, 0, 1, '[]'); raise exception 'usuário gravou a rodada direto';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role service_role;
do $$
declare l uuid := (select liga from t);
begin
  if not public.liga_iniciar(l, '{"round":0}') then raise exception 'não iniciou'; end if;
  if public.liga_iniciar(l, '{"round":0}') then raise exception 'iniciou duas vezes'; end if;
  -- duas confirmações ao mesmo tempo: as duas leram rodada 0, versão 1; só a primeira grava
  if not public.liga_gravar_rodada(l, 0, 1, '{"round":1}', 2024, 0, 7, '[{"h":"c1"}]') then raise exception 'primeira gravação falhou'; end if;
  if public.liga_gravar_rodada(l, 0, 1, '{"round":99}', 2024, 0, 7, '[]') then raise exception 'rodada gravada duas vezes'; end if;
  if (select count(*) from public.liga_resultados where liga_id = l) <> 1 then raise exception 'resultado duplicado'; end if;
  if (select estado->>'round' from public.liga_estado where liga_id = l) <> '1' then raise exception 'estado errado'; end if;
  if (select rodada from public.ligas where id = l) <> 1 or (select versao from public.ligas where id = l) <> 2 then raise exception 'contadores errados'; end if;
end $$;
select 'rodada da liga OK' as resultado;
rollback;
