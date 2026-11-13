-- #32: criar liga, entrar por código e escolher clube.
-- As ações são funções do banco (security definer) em vez de Edge Functions: são simples, atômicas e não precisam
-- do motor do jogo. O estado da liga (liga_estado) só é criado quando a liga começar (#34), pelo servidor.

alter table public.ligas add column series text[] not null default '{A}'
  check (series <@ array['A','B','C','D'] and cardinality(series) between 1 and 4);

-- No lobby, cada membro vê o nome dos outros técnicos da mesma liga.
create function privado.mesma_liga(outro uuid) returns boolean
  language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.liga_membros a join public.liga_membros b on a.liga_id = b.liga_id
                 where a.user_id = (select auth.uid()) and b.user_id = outro);
$$;
revoke all on function privado.mesma_liga(uuid) from public;
grant execute on function privado.mesma_liga(uuid) to authenticated;
create policy "perfil: membros da mesma liga leem" on public.profiles
  for select to authenticated using (privado.mesma_liga(id));

-- Clube: só o formato é conferido aqui (os clubes vêm dos dados do jogo, no navegador).
-- shortcut: o servidor não sabe a série de cada clube; quando o estado da liga for criado no servidor (#34), validar contra ele.
create function privado.clube_valido(c text) returns boolean language sql immutable set search_path = ''
as $$ select c ~ '^c[0-9]{1,8}$' $$;

create function public.criar_liga(nome text, series text[], club_id text) returns public.ligas
  language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  l public.ligas;
begin
  if eu is null then raise exception 'Entre na sua conta para criar uma liga.'; end if;
  if not privado.clube_valido(club_id) then raise exception 'Clube inválido.'; end if;
  if (select count(*) from public.ligas where dono_id = eu and status <> 'encerrada') >= 5 then
    raise exception 'Você já tem 5 ligas abertas.';
  end if;
  loop -- código de convite curto, sem letras que se confundem
    begin
      insert into public.ligas (nome, dono_id, codigo_convite, series)
      values (btrim(nome), eu,
              (select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '') from generate_series(1, 6)),
              series)
      returning * into l;
      exit;
    exception when unique_violation then null; -- código repetido: sorteia outro
    end;
  end loop;
  insert into public.liga_membros (liga_id, user_id, club_id) values (l.id, eu, club_id);
  return l;
end;
$$;

create function public.entrar_liga(codigo text) returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  l public.ligas;
begin
  if eu is null then raise exception 'Entre na sua conta para entrar numa liga.'; end if;
  select * into l from public.ligas where codigo_convite = upper(btrim(codigo));
  if l.id is null then raise exception 'Código de convite não encontrado.'; end if;
  if exists (select 1 from public.liga_membros where liga_id = l.id and user_id = eu) then return l.id; end if;
  if l.status <> 'aberta' then raise exception 'Esta liga já começou; não aceita novos técnicos.'; end if;
  if (select count(*) from public.liga_membros where liga_id = l.id) >= 20 then raise exception 'A liga está cheia.'; end if;
  insert into public.liga_membros (liga_id, user_id) values (l.id, eu);
  return l.id;
end;
$$;

create function public.escolher_clube(liga uuid, club_id text) returns void
  language plpgsql security definer set search_path = ''
as $$
declare eu uuid := (select auth.uid());
begin
  if eu is null then raise exception 'Entre na sua conta.'; end if;
  if not privado.clube_valido(club_id) then raise exception 'Clube inválido.'; end if;
  if not exists (select 1 from public.ligas where id = liga and status = 'aberta') then
    raise exception 'Só dá para trocar de clube antes de a liga começar.';
  end if;
  update public.liga_membros set club_id = escolher_clube.club_id where liga_id = liga and user_id = eu;
  if not found then raise exception 'Você não é membro desta liga.'; end if;
exception when unique_violation then
  raise exception 'Esse clube já tem técnico nesta liga.';
end;
$$;

-- Só quem está logado chama as funções (dentro delas, auth.uid() identifica quem é).
revoke execute on function public.criar_liga(text, text[], text), public.entrar_liga(text), public.escolher_clube(uuid, text) from public, anon;
grant execute on function public.criar_liga(text, text[], text), public.entrar_liga(text), public.escolher_clube(uuid, text) to authenticated;
