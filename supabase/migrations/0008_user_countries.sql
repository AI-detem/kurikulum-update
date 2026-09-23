-- Uživatel může spravovat víc zemí (např. Česko i anglickou verzi).
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run

-- ---------------------------------------------------------------------
-- 1. Vazební tabulka a převod dosavadních přiřazení
-- ---------------------------------------------------------------------

create table if not exists user_countries (
  user_id uuid not null references users (id) on delete cascade,
  country_id uuid not null references countries (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, country_id)
);

insert into user_countries (user_id, country_id)
  select id, country_id from users where country_id is not null
  on conflict do nothing;

-- users.country_id zůstává, ale appka ho už nečte. Nechává se kvůli
-- starším záznamům a pro případ, že by se převod musel opakovat.

alter table user_countries enable row level security;

create policy "sve zeme vidi kazdy, cizi jen admin" on user_countries
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "prirazeni zemi meni jen admin" on user_countries
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 2. Pomocné funkce: místo "jeho země" nově "jedna z jeho zemí"
-- ---------------------------------------------------------------------

create or replace function public.is_my_country(c_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.user_countries
    where user_id = auth.uid() and country_id = c_id
  );
$$;

-- current_country_id() vracelo jedinou zemi a dál by lhalo. Pravidla pod
-- ním se přepisují níž, funkce sama se ruší, ať ji nikdo nepoužije omylem.

create or replace function public.can_write_for_country(c_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('admin', 'editor')
      and (u.role = 'admin' or public.is_my_country(c_id))
  );
$$;

create or replace function public.can_write_version(v_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1
    from public.document_versions dv
    join public.users u on u.id = auth.uid()
    where dv.id = v_id
      and u.role in ('admin', 'editor')
      and (u.role = 'admin' or public.is_my_country(dv.country_id))
  );
$$;

create or replace function public.annotation_shared_with_me(a_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.annotation_country_status s
    where s.annotation_id = a_id and public.is_my_country(s.country_id)
  );
$$;

create or replace function public.version_shared_with_me(v_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1
    from public.annotation_country_status s
    join public.annotations a on a.id = s.annotation_id
    where a.document_version_id = v_id and public.is_my_country(s.country_id)
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Pravidla, která se ptala na jedinou zemi
-- ---------------------------------------------------------------------

drop policy if exists "verze vidi jen sva zeme nebo admin" on document_versions;
create policy "verze vidi jen sve zeme nebo admin" on document_versions
  for select to authenticated
  using (public.is_my_country(country_id) or public.is_admin());

drop policy if exists "zmeny vidi kdo vidi verzi" on changes;
create policy "zmeny vidi kdo vidi verzi" on changes
  for select to authenticated
  using (
    exists (
      select 1 from document_versions dv
      where dv.id = changes.document_version_id
        and (public.is_my_country(dv.country_id) or public.is_admin())
    )
  );

drop policy if exists "znacky vidi kdo vidi verzi" on annotations;
create policy "znacky vidi kdo vidi verzi" on annotations
  for select to authenticated
  using (
    exists (
      select 1 from document_versions dv
      where dv.id = annotations.document_version_id
        and (public.is_my_country(dv.country_id) or public.is_admin())
    )
  );

drop policy if exists "stav zmeny vidi jen jeji zeme nebo admin" on annotation_country_status;
create policy "stav zmeny vidi jen jeji zeme nebo admin" on annotation_country_status
  for select to authenticated
  using (public.is_my_country(country_id) or public.is_admin());

drop policy if exists "stav zmeny meni jen jeji zeme nebo admin" on annotation_country_status;
create policy "stav zmeny meni jen jeji zeme nebo admin" on annotation_country_status
  for update to authenticated
  using (public.is_my_country(country_id) or public.is_admin())
  with check (public.is_my_country(country_id) or public.is_admin());

drop function if exists public.current_country_id();
