-- Překlad poznámek do jazyků ostatních zemí + tichý záznam adminových oprav.
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run

-- ---------------------------------------------------------------------
-- 1. Překlady
-- ---------------------------------------------------------------------
-- Originál zůstává v note a nikdy se nepřepisuje. Překlady leží vedle něj
-- jako {"cs": "...", "sk": "...", ...}. Metodiky samotné se nepřekládají,
-- jen poznámky ke změnám a celkové shrnutí.

alter table annotations
  add column if not exists source_locale text,
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists translation_failed boolean not null default false;

alter table changes
  add column if not exists source_locale text,
  add column if not exists translations jsonb not null default '{}'::jsonb,
  add column if not exists translation_failed boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. Tichý záznam adminových oprav
-- ---------------------------------------------------------------------
-- Admin smí opravit i cizí nahrávku. Nevzniká nová verze, nic se
-- nerozesílá a v appce to není vidět – ale musí se to dát dohledat.

create table if not exists admin_edits (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- 'annotation' | 'change' | 'version'
  entity text not null,
  entity_id uuid,
  document_version_id uuid references document_versions (id) on delete set null,
  -- 'insert' | 'update' | 'delete'
  action text not null,
  before jsonb,
  after jsonb
);

create index if not exists admin_edits_version_idx
  on admin_edits (document_version_id, created_at desc);

alter table admin_edits enable row level security;

create policy "zaznam oprav vidi jen admin" on admin_edits
  for select to authenticated using (public.is_admin());

create policy "zaznam oprav zapisuje jen admin" on admin_edits
  for insert to authenticated with check (public.is_admin());

grant select, insert on admin_edits to authenticated;

-- ---------------------------------------------------------------------
-- 3. Admin smí uklidit i cizí zveřejněnou verzi
-- ---------------------------------------------------------------------
-- Pravidlo z migrace 0005 pouštělo mazání jen u rozpracovaných verzí.
-- Pravidla se sčítají, tohle je přidává adminovi na všechny.

create policy "verzi maze i admin" on document_versions
  for delete to authenticated
  using (public.is_admin());
