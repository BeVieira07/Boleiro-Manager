-- #32: confere no banco real as funções da liga e as regras de acesso (rollback no fim, não deixa rastro).
-- A cria a liga, B entra pelo código, C não é membro. Se algo falhar, dá erro com a explicação.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'teste-a@exemplo.com'),
  ('00000000-0000-0000-0000-00000000000b', 'teste-b@exemplo.com'),
  ('00000000-0000-0000-0000-00000000000c', 'teste-c@exemplo.com');
create temp table t (liga uuid, codigo text);
grant all on t to authenticated, anon;

set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into t select id, codigo_convite from public.criar_liga('Liga dos amigos', array['A','B'], 'c118');

-- B entra pelo código (minúsculo e com espaço também vale) e escolhe um clube
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare l uuid; c text;
begin
  select liga, codigo into l, c from t;
  if public.entrar_liga(' ' || lower(c)) <> l then raise exception 'entrar_liga devolveu outra liga'; end if;
  begin perform public.escolher_clube(l, 'c118'); raise exception 'B pegou o clube de A';
  exception when others then if sqlerrm not like '%já tem técnico%' then raise; end if; end;
  perform public.escolher_clube(l, 'c127');
  if (select count(*) from public.liga_membros where liga_id = l) <> 2 then raise exception 'B deveria ver os 2 membros'; end if;
  if (select count(*) from public.profiles) <> 2 then raise exception 'B deveria ver o nome de A no lobby'; end if;
  -- B não altera o estado da liga nem as entradas/membros de A
  update public.ligas set status = 'encerrada', rodada = 9 where id = l;
  update public.liga_membros set club_id = 'c999' where liga_id = l and user_id <> (select auth.uid());
  begin insert into public.liga_estado (liga_id, estado) values (l, '{}'); raise exception 'B gravou o estado da liga';
  exception when insufficient_privilege then null; end;
  begin insert into public.liga_entradas (liga_id, user_id, rodada) values (l, '00000000-0000-0000-0000-00000000000a', 0);
    raise exception 'B gravou a entrada de A';
  exception when insufficient_privilege then null; end;
  insert into public.liga_entradas (liga_id, user_id, rodada) values (l, (select auth.uid()), 0); -- a própria pode
  begin insert into public.liga_membros (liga_id, user_id, club_id) values (l, '00000000-0000-0000-0000-00000000000c', 'c1');
    raise exception 'B adicionou um membro direto na tabela';
  exception when insufficient_privilege then null; end;
end $$;

-- C não é membro: não vê nada da liga nem o perfil dos outros
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
do $$ begin
  if (select count(*) from public.ligas) + (select count(*) from public.liga_membros) + (select count(*) from public.liga_entradas) <> 0
    then raise exception 'C viu a liga sem ser membro'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'C viu perfis de outros'; end if;
  begin perform public.escolher_clube((select liga from t), 'c130'); raise exception 'C escolheu clube sem ser membro';
  exception when others then if sqlerrm not like '%não é membro%' then raise; end if; end;
end $$;

-- sem login: as funções não podem ser chamadas
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  begin perform public.entrar_liga((select codigo from t)); raise exception 'anon entrou na liga';
  exception when insufficient_privilege then null; end;
end $$;

reset role;
do $$
declare l uuid := (select liga from t);
begin
  if (select status from public.ligas where id = l) <> 'aberta' then raise exception 'B alterou a liga'; end if;
  if (select club_id from public.liga_membros where liga_id = l and user_id = '00000000-0000-0000-0000-00000000000a') <> 'c118'
    then raise exception 'B alterou o clube de A'; end if;
end $$;
select 'Ligas e RLS OK' as resultado;
rollback;
