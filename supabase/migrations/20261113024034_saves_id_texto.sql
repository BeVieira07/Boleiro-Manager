-- #31: o id do save é o mesmo do navegador (S.saveId, texto curto), então a chave vira (user_id, id).
-- atualizado_em passa a vir do navegador (a mesma data do resumo local), para comparar "o mais recente" no mesmo relógio.
alter table public.saves drop constraint saves_pkey;
alter table public.saves alter column id drop default;
alter table public.saves alter column id type text using id::text;
alter table public.saves add constraint saves_id_tamanho check (char_length(id) between 1 and 40);
alter table public.saves add primary key (user_id, id);
drop index if exists public.saves_user_id_idx; -- a chave primária já começa por user_id
