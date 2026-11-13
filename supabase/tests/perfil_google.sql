-- #84: o perfil começa com o nome da conta Google; sem nome, com a parte do e-mail antes do @ (rollback no fim).
begin;
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000a1', 'teste.google@exemplo.com', '{"full_name":"Fulano do Google"}'),
  ('00000000-0000-0000-0000-0000000000a2', 'teste.link@exemplo.com', '{}');
do $$ begin
  if (select nome from public.profiles where id = '00000000-0000-0000-0000-0000000000a1') <> 'Fulano do Google' then raise exception 'nome do Google'; end if;
  if (select nome from public.profiles where id = '00000000-0000-0000-0000-0000000000a2') <> 'teste.link' then raise exception 'nome do e-mail'; end if;
  if has_function_privilege('authenticated', 'public.criar_perfil()', 'execute') then raise exception 'função exposta na API'; end if;
end $$;
select 'perfil com Google OK' as resultado;
rollback;
