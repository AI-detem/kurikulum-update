-- Dokončení migrace 0008 + jazyk rozhraní podle uživatele.
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run

-- ---------------------------------------------------------------------
-- 1. Stará pravidla na úložišti souborů
-- ---------------------------------------------------------------------
-- Migrace 0008 chtěla zrušit funkci current_country_id(), ale v produkci
-- na ní visela dvě pravidla z doby, kdy se PDF nahrávala do Supabase
-- Storage (bucket "documents"). Dneska appka drží jen odkazy na Google
-- Drive, do úložiště nic nezapisuje ani z něj nečte.
--
-- Ta pravidla proto ruším. Nechat je nejde: current_country_id() vracelo
-- jedinou zemi, takže by od migrace 0008 rozhodovala špatně – uživateli
-- se dvěma zeměmi by pustila jen jednu, a to náhodně vybranou.
-- Soubory v bucketu zůstávají, jen k nim běžný uživatel nemá přístup
-- (bez pravidla RLS zakazuje vše). Kdyby se úložiště někdy vrátilo,
-- napíšou se pravidla nová, nad is_my_country().

do $$
begin
  drop policy if exists "cteni pdf jen pro svou zemi nebo admina" on storage.objects;
  drop policy if exists "nahravani pdf jen admin nebo editor" on storage.objects;
exception
  when insufficient_privilege then
    raise notice 'Na pravidla u storage.objects chybí oprávnění. Smaž je prosím ručně: Storage -> Policies -> bucket documents.';
  when undefined_table then
    raise notice 'storage.objects tady není, přeskakuji.';
end $$;

-- Teprve teď jde zrušit funkci, kterou nahradila is_my_country().
do $$
begin
  drop function if exists public.current_country_id();
exception
  when dependent_objects_still_exist then
    raise notice 'Na current_country_id() ještě něco visí, funkce zůstává. Zkontroluj pravidla, která ji používají.';
end $$;

-- ---------------------------------------------------------------------
-- 2. Jazyk rozhraní podle uživatele
-- ---------------------------------------------------------------------
-- Rozhraní se dosud řídilo prohlíženou zemí, takže se adminovi přepnulo
-- do slovenštiny jen proto, že se díval na Slovensko. Nově má jazyk
-- vlastní. Prázdná hodnota znamená "podle první přiřazené země".

alter table users
  add column if not exists locale text;
