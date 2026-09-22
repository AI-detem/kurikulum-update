-- Rozpracovaná verze (draft): značky se ukládají průběžně, ale verze se
-- v přehledu objeví a notifikace odejdou až při zveřejnění.
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run

alter table document_versions
  add column if not exists status text not null default 'draft',
  add column if not exists published_at timestamptz;

-- Číslo verze se přiděluje až při zveřejnění, rozpracovaná ho nemá.
alter table document_versions
  alter column version_number drop not null;

-- Všechno, co v databázi bylo před touhle změnou, je zveřejněné.
update document_versions
  set status = 'published',
      published_at = coalesce(published_at, uploaded_at)
  where published_at is null and version_number is not null;

-- Rozpracované verze mají version_number prázdné a Postgres bere každou
-- prázdnou hodnotu jako jinou, takže si navzájem nepřekážejí. Unikátnost
-- čísel u zveřejněných verzí (module_id, country_id, version_number)
-- zůstává z první migrace v platnosti.

create index if not exists document_versions_draft_idx
  on document_versions (uploaded_by, status);
