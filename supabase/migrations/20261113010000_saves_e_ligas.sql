-- Saves na nuvem (#31) e tabelas da liga (#32–#37), conforme docs/online.md seção 3.3.
-- Na liga, só o servidor (Edge Functions com a chave de serviço) grava o estado; os navegadores só leem,
-- e cada técnico grava apenas a própria entrada da rodada.

-- ===== Solo: saves na nuvem =====
create table public.saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  resumo jsonb not null default '{}',
  estado jsonb not null,
  atualizado_em timestamptz not null default now()
);
create index saves_user_id_idx on public.saves (user_id);

alter table public.saves enable row level security;
create policy "save: o dono lê" on public.saves
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "save: o dono cria" on public.saves
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "save: o dono altera" on public.saves
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "save: o dono apaga" on public.saves
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ===== Liga =====
create table public.ligas (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 1 and 60),
  dono_id uuid not null references auth.users (id) on delete cascade,
  codigo_convite text not null unique,
  status text not null default 'aberta' check (status in ('aberta', 'andamento', 'encerrada')),
  rodada int not null default 0,
  versao int not null default 0,
  criada_em timestamptz not null default now()
);
create index ligas_dono_id_idx on public.ligas (dono_id);

create table public.liga_estado (
  liga_id uuid primary key references public.ligas (id) on delete cascade,
  versao int not null default 0,
  estado jsonb not null
);

create table public.liga_membros (
  liga_id uuid not null references public.ligas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  club_id text,
  entrou_em timestamptz not null default now(),
  primary key (liga_id, user_id),
  unique (liga_id, club_id)
);
create index liga_membros_user_id_idx on public.liga_membros (user_id);

-- Uma linha por técnico, reaproveitada a cada rodada.
create table public.liga_entradas (
  liga_id uuid not null,
  user_id uuid not null,
  rodada int not null,
  escalacao jsonb not null default '{}',
  formacao text,
  estilo text,
  modo text,
  pronto boolean not null default false,
  atualizado_em timestamptz not null default now(),
  primary key (liga_id, user_id),
  foreign key (liga_id, user_id) references public.liga_membros (liga_id, user_id) on delete cascade
);

create table public.liga_resultados (
  liga_id uuid not null references public.ligas (id) on delete cascade,
  temporada int not null,
  rodada int not null,
  semente bigint not null,
  jogos jsonb not null,
  primary key (liga_id, temporada, rodada)
);

create table public.liga_propostas (
  id uuid primary key default gen_random_uuid(),
  liga_id uuid not null references public.ligas (id) on delete cascade,
  de_user uuid not null references auth.users (id) on delete cascade,
  para_user uuid references auth.users (id) on delete cascade, -- null = clube da IA
  player_id text not null,
  tipo text not null check (tipo in ('compra', 'emprestimo')),
  valor numeric not null default 0,
  condicoes jsonb not null default '{}',
  status text not null default 'pendente' check (status in ('pendente', 'aceita', 'recusada', 'contraproposta', 'cancelada')),
  criada_em timestamptz not null default now()
);
create index liga_propostas_liga_id_idx on public.liga_propostas (liga_id);
create index liga_propostas_de_user_idx on public.liga_propostas (de_user);
create index liga_propostas_para_user_idx on public.liga_propostas (para_user);

create table public.liga_noticias (
  id bigint generated always as identity primary key,
  liga_id uuid not null references public.ligas (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade, -- null = notícia para todos
  rodada int not null,
  texto text not null,
  criada_em timestamptz not null default now()
);
create index liga_noticias_liga_id_idx on public.liga_noticias (liga_id);
create index liga_noticias_user_id_idx on public.liga_noticias (user_id);

-- Fora do schema public para não virar endpoint da API; security definer evita recursão nas regras de liga_membros.
create schema if not exists privado;
create function privado.eh_membro(liga uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.liga_membros m where m.liga_id = liga and m.user_id = (select auth.uid()));
$$;
revoke all on function privado.eh_membro(uuid) from public;
grant usage on schema privado to authenticated;
grant execute on function privado.eh_membro(uuid) to authenticated;

-- Leitura só para membros; escrita só pelo servidor (sem regras de insert/update = bloqueado para o navegador).
alter table public.ligas enable row level security;
alter table public.liga_estado enable row level security;
alter table public.liga_membros enable row level security;
alter table public.liga_entradas enable row level security;
alter table public.liga_resultados enable row level security;
alter table public.liga_propostas enable row level security;
alter table public.liga_noticias enable row level security;

create policy "liga: membros leem" on public.ligas
  for select to authenticated using (privado.eh_membro(id));
create policy "estado: membros leem" on public.liga_estado
  for select to authenticated using (privado.eh_membro(liga_id));
create policy "membros: membros leem" on public.liga_membros
  for select to authenticated using (privado.eh_membro(liga_id));
create policy "resultados: membros leem" on public.liga_resultados
  for select to authenticated using (privado.eh_membro(liga_id));
create policy "entradas: membros leem" on public.liga_entradas
  for select to authenticated using (privado.eh_membro(liga_id));
create policy "propostas: envolvidos leem" on public.liga_propostas
  for select to authenticated using ((select auth.uid()) in (de_user, para_user));
create policy "noticias: membros leem as suas e as gerais" on public.liga_noticias
  for select to authenticated
  using (privado.eh_membro(liga_id) and (user_id is null or user_id = (select auth.uid())));

-- O técnico grava só a própria entrada e só para a rodada atual da liga.
create policy "entradas: o técnico cria a sua" on public.liga_entradas
  for insert to authenticated
  with check ((select auth.uid()) = user_id
    and rodada = (select l.rodada from public.ligas l where l.id = liga_id));
create policy "entradas: o técnico altera a sua" on public.liga_entradas
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id
    and rodada = (select l.rodada from public.ligas l where l.id = liga_id));
