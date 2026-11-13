-- #84: quem entra com o Google começa com o nome da conta Google; pelo link mágico, a parte do e-mail antes do @.
-- create or replace mantém o gatilho e o revoke de antes (a função só roda pelo gatilho de auth.users).
create or replace function public.criar_perfil() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome) values (new.id, left(coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(new.email, '@', 1)), 40));
  return new;
end;
$$;
