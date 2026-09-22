-- Informování ostatních zemí o změnách + semafor rozpracovanosti.
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run

-- ---------------------------------------------------------------------
-- 1. Tabulka: kdo má na kterou značku ještě zareagovat
-- ---------------------------------------------------------------------
-- Jeden řádek = jedna vyznačená změna + jedna země, které se to týká.
-- country_id je PŘÍJEMCE, ne autor změny. Řádky vznikají až při zveřejnění
-- verze, u rozpracované ne.

create table if not exists annotation_country_status (
  id uuid primary key default gen_random_uuid(),
  annotation_id uuid not null references annotations (id) on delete cascade,
  country_id uuid not null references countries (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'dismissed')),
  created_at timestamptz not null default now(),
  dismissed_at timestamptz,
  dismissed_by uuid references users (id) on delete set null,
  unique (annotation_id, country_id)
);

create index if not exists annotation_country_status_country_idx
  on annotation_country_status (country_id, status);

alter table annotation_country_status enable row level security;

-- ---------------------------------------------------------------------
-- 2. Pomocné funkce
-- ---------------------------------------------------------------------
-- Obě jsou "security definer", takže samy o sobě nepodléhají RLS pravidlům.
-- Kdyby pravidlo pro značky sahalo na verze a pravidlo pro verze zpátky na
-- značky, Postgres by skončil chybou o nekonečném zanoření.

create or replace function public.annotation_shared_with_me(a_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.annotation_country_status s
    where s.annotation_id = a_id
      and s.country_id = public.current_country_id()
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
    where a.document_version_id = v_id
      and s.country_id = public.current_country_id()
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Row Level Security
-- ---------------------------------------------------------------------
-- Editor i čtenář vidí a řeší jen řádky své země, admin vidí všechno.

create policy "stav zmeny vidi jen jeji zeme nebo admin" on annotation_country_status
  for select to authenticated
  using (country_id = public.current_country_id() or public.is_admin());

-- "Netýká se nás" je úprava existujícího řádku, proto jen update.
create policy "stav zmeny meni jen jeji zeme nebo admin" on annotation_country_status
  for update to authenticated
  using (country_id = public.current_country_id() or public.is_admin())
  with check (country_id = public.current_country_id() or public.is_admin());

-- Řádky zakládá ten, kdo zveřejňuje verzi.
create policy "stav zmeny zaklada admin nebo editor" on annotation_country_status
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'editor')
    )
  );

-- Aby země viděla cizí značku, kterou má vyřešit, musí se dostat i k samotné
-- značce a k verzi dokumentu, ve které leží. Pravidla se sčítají (stačí,
-- aby platilo jedno), takže tohle nijak nerozšiřuje přístup k ostatnímu.

create policy "znacku vidi i zeme, ktera ji ma vyresit" on annotations
  for select to authenticated
  using (public.annotation_shared_with_me(id));

create policy "verzi vidi i zeme, ktera resi jeji znacky" on document_versions
  for select to authenticated
  using (public.version_shared_with_me(id));

-- ---------------------------------------------------------------------
-- 4. Semafor
-- ---------------------------------------------------------------------
-- Barva se nikam neukládá, počítá se vždy z nejstaršího nevyřešeného řádku.
-- Modul, který v seznamu není, je v pořádku (zelená).
-- security_invoker = pohled se dívá očima přihlášeného uživatele, takže
-- platí stejná RLS pravidla jako na tabulkách pod ním.

create or replace view module_country_light
with (security_invoker = true) as
select
  dv.module_id,
  s.country_id,
  count(*) as pending_count,
  min(s.created_at) as oldest_pending_at,
  case
    when min(s.created_at) > now() - interval '14 days' then 'yellow'
    else 'red'
  end as light
from annotation_country_status s
join annotations a on a.id = s.annotation_id
join document_versions dv on dv.id = a.document_version_id
where s.status = 'pending'
group by dv.module_id, s.country_id;

-- Supabase běžně práva novým tabulkám přiděluje samo, tohle je jen pojistka.
grant select, insert, update on annotation_country_status to authenticated;
grant select on module_country_light to authenticated;
