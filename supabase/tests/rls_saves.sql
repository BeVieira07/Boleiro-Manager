-- #31: confere as regras de acesso (RLS) da tabela saves no banco real, sem deixar rastro (rollback no fim).
-- Rodar no SQL Editor do Supabase (ou pelo MCP execute_sql). Se alguma regra falhar, dá erro com a explicação.
begin;
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'teste-a@exemplo.com'),
  ('00000000-0000-0000-0000-00000000000b', 'teste-b@exemplo.com');

-- A grava um save
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
insert into public.saves (id, resumo, estado, atualizado_em) values ('s1', '{}', '{"round":3}', now());
do $$ begin
  if (select count(*) from public.saves) <> 1 then raise exception 'A deveria ver o próprio save'; end if;
end $$;

-- B não vê, não altera e não apaga o save de A, nem grava em nome de A
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
do $$
declare n int;
begin
  if (select count(*) from public.saves) <> 0 then raise exception 'B leu o save de A'; end if;
  update public.saves set estado = '{"round":99}' where id = 's1';
  delete from public.saves where id = 's1';
  begin
    insert into public.saves (id, user_id, estado) values ('s2', '00000000-0000-0000-0000-00000000000a', '{}');
    raise exception 'B gravou um save em nome de A';
  exception when insufficient_privilege then null; -- esperado: bloqueado pela RLS
  end;
end $$;

-- sem login (anon) também não vê nada
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';
do $$ begin
  if (select count(*) from public.saves) <> 0 then raise exception 'anon leu saves'; end if;
end $$;

-- o save de A continua intacto
reset role;
do $$ begin
  if (select estado->>'round' from public.saves where id = 's1') <> '3' then raise exception 'B alterou ou apagou o save de A'; end if;
end $$;
select 'RLS de saves OK' as resultado;
rollback;
