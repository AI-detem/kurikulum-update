-- AI kurikulum – základní databázové schéma
-- Spustit v Supabase projektu: SQL Editor -> New query -> vlož celý soubor -> Run
-- (nebo přes Supabase CLI: supabase db push)

-- ---------------------------------------------------------------------
-- 1. Tabulky
-- ---------------------------------------------------------------------

create table if not exists countries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  locale text not null, -- napr. 'cs', 'sk', 'en', 'hu'
  created_at timestamptz not null default now()
);

do $$ begin
  create type user_role as enum ('admin', 'editor', 'viewer');
exception
  when duplicate_object then null;
end $$;

-- Vlastní tabulka uživatelů, propojená 1:1 s auth.users (přihlašování řeší Supabase Auth).
create table if not exists users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  country_id uuid references countries (id) on delete set null,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create table if not exists modules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules (id) on delete cascade,
  country_id uuid not null references countries (id) on delete cascade,
  file_url text not null,
  version_number integer not null,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references users (id) on delete set null,
  unique (module_id, country_id, version_number)
);

create table if not exists changes (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references document_versions (id) on delete cascade,
  note text not null,
  category text,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  change_id uuid not null references changes (id) on delete cascade,
  read_at timestamptz,
  email_sent_at timestamptz
);

-- ---------------------------------------------------------------------
-- 2. Automatické založení řádku v public.users při registraci
-- ---------------------------------------------------------------------
-- Když se někdo poprvé přihlásí přes magic link, Supabase Auth vytvoří
-- záznam v auth.users. Tenhle trigger k němu automaticky založí i řádek
-- v public.users (zatím bez země, s rolí 'viewer') – admin mu pak v appce
-- přiřadí zemi a případně vyšší roli.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ---------------------------------------------------------------------
-- 3. Row Level Security (kdo co smí vidět/měnit)
-- ---------------------------------------------------------------------

alter table countries enable row level security;
alter table users enable row level security;
alter table modules enable row level security;
alter table document_versions enable row level security;
alter table changes enable row level security;
alter table notifications enable row level security;

-- Pomocná funkce: je aktuálně přihlášený uživatel admin?
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- Pomocná funkce: country_id aktuálně přihlášeného uživatele.
create or replace function public.current_country_id()
returns uuid
language sql security definer set search_path = public
as $$
  select country_id from public.users where id = auth.uid();
$$;

-- countries: číst může každý přihlášený, měnit jen admin.
create policy "countries jsou viditelne pro prihlasene" on countries
  for select to authenticated using (true);
create policy "countries meni jen admin" on countries
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- users: každý vidí sám sebe, admin vidí a spravuje všechny.
create policy "uzivatel vidi sam sebe" on users
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin spravuje uzivatele" on users
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "uzivatel si upravi jen sebe (bez zmeny role)" on users
  for update to authenticated using (id = auth.uid());

-- modules: číst může každý přihlášený, spravovat jen admin.
create policy "moduly jsou viditelne pro prihlasene" on modules
  for select to authenticated using (true);
create policy "moduly meni jen admin" on modules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- document_versions: viewer vidí jen svou zemi, admin/editor vidí i nahrávají.
create policy "verze vidi jen sva zeme nebo admin" on document_versions
  for select to authenticated
  using (country_id = public.current_country_id() or public.is_admin());
create policy "verze naharava admin nebo editor" on document_versions
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'editor')
    )
  );

-- changes: viditelné, pokud je vidět příslušná verze dokumentu.
create policy "zmeny vidi kdo vidi verzi" on changes
  for select to authenticated
  using (
    exists (
      select 1 from document_versions dv
      where dv.id = changes.document_version_id
        and (dv.country_id = public.current_country_id() or public.is_admin())
    )
  );
create policy "zmeny zapisuje admin nebo editor" on changes
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'editor')
    )
  );

-- notifications: uživatel vidí a upravuje (označí přečtené) jen svoje.
create policy "notifikace vidi jen vlastnik" on notifications
  for select to authenticated using (user_id = auth.uid());
create policy "notifikace oznaci precteno jen vlastnik" on notifications
  for update to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- 4. PDF soubory
-- ---------------------------------------------------------------------
-- PDF metodik leží na Google Drive, v databázi je jen odkaz na ně
-- (document_versions.file_url). Appka proto nepotřebuje žádné vlastní
-- úložiště souborů.
