-- Perfis dos técnicos (#30). Um perfil por conta, criado automaticamente no primeiro login.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '' check (char_length(nome) <= 40),
  criado_em timestamptz not null default now()
);

-- Regras de acesso: cada um lê e altera só o próprio perfil.
alter table public.profiles enable row level security;

create policy "perfil: o dono lê" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);

create policy "perfil: o dono altera" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Cria o perfil quando a conta é criada; o nome começa como a parte do e-mail antes do @.
create function public.criar_perfil() returns trigger
  language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, nome) values (new.id, left(split_part(new.email, '@', 1), 40));
  return new;
end;
$$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();
