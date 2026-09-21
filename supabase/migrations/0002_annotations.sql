-- Označená místa v dokumentu (značky) a jejich popisy.
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run

create table if not exists annotations (
  id uuid primary key default gen_random_uuid(),
  document_version_id uuid not null references document_versions (id) on delete cascade,
  page int not null, -- číslováno od 0
  -- poloha a velikost jako podíl 0..1 vůči stránce, aby značka seděla
  -- i po změně velikosti okna
  x real not null,
  y real not null,
  w real not null,
  h real not null,
  note text not null,
  category text,
  created_at timestamptz not null default now()
);

create index if not exists annotations_version_idx
  on annotations (document_version_id);

alter table annotations enable row level security;

-- Značky vidí ten, kdo vidí příslušnou verzi dokumentu.
create policy "znacky vidi kdo vidi verzi" on annotations
  for select to authenticated
  using (
    exists (
      select 1 from document_versions dv
      where dv.id = annotations.document_version_id
        and (dv.country_id = public.current_country_id() or public.is_admin())
    )
  );

-- Zakládat, upravovat a mazat je smí admin a editor.
create policy "znacky zapisuje admin nebo editor" on annotations
  for insert to authenticated
  with check (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'editor')
    )
  );

create policy "znacky upravuje admin nebo editor" on annotations
  for update to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'editor')
    )
  );

create policy "znacky maze admin nebo editor" on annotations
  for delete to authenticated
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role in ('admin', 'editor')
    )
  );
