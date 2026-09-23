-- Katalog metodik se natahuje z kurikulum.aidetem.cz, ne klikáním ručně.
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run

alter table modules
  -- část adresy /knowledgebase/<slug>/ – podle ní se metodika poznává
  -- při dalším importu, i když se přejmenuje
  add column if not exists slug text,
  add column if not exists source_url text,
  add column if not exists name_en text,
  -- pořadí, v jakém metodika stojí na webu ve své sekci
  add column if not exists order_index integer not null default 0,
  -- metodika, která z webu zmizela. Nikdy se nemaže, jen se schová.
  add column if not exists archived_at timestamptz;

-- Sekce z webu se ukládá do sloupce category, který už existuje
-- a na přehledu se zobrazuje jako pilulka.

create unique index if not exists modules_slug_key
  on modules (slug) where slug is not null;

create index if not exists modules_archived_idx
  on modules (archived_at);
