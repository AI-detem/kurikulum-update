-- Oprávnění k zápisu do verzí dokumentů a značek.
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run
--
-- První migrace dala tabulce document_versions jen pravidla pro čtení a
-- vkládání. Na úpravu a mazání žádné pravidlo nebylo, a co RLS výslovně
-- nepovolí, to zakazuje – takže zveřejnění verze (draft -> published),
-- přepsání rozpracované verze i zahození rozdělané práce tiše měnily
-- nula řádků. Appka to hlásila jako "Cannot coerce the result to a single
-- JSON object", protože po úpravě čekala právě jeden vrácený řádek.
--
-- Zároveň se tady dorovnává, že editor má práva jen ve své zemi. Dosud
-- stačilo mít roli editor a šlo zapisovat i pod cizí zemi.

-- ---------------------------------------------------------------------
-- Pomocná funkce: smí přihlášený uživatel zapisovat do téhle verze?
-- ---------------------------------------------------------------------
-- "security definer" = funkce se sama neřídí RLS pravidly. Kdyby se jimi
-- řídila, pravidlo pro značky by sahalo na verze a pravidlo pro verze
-- zpátky na značky a Postgres by to odmítl jako nekonečné zanoření.

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
      and (u.role = 'admin' or dv.country_id = u.country_id)
  );
$$;

-- Totéž pro řádek, který teprve vzniká (u insertu ještě verze neexistuje).
create or replace function public.can_write_for_country(c_id uuid)
returns boolean
language sql security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and u.role in ('admin', 'editor')
      and (u.role = 'admin' or u.country_id = c_id)
  );
$$;

-- ---------------------------------------------------------------------
-- Verze dokumentů
-- ---------------------------------------------------------------------

drop policy if exists "verze naharava admin nebo editor" on document_versions;

create policy "verzi zaklada admin nebo editor sve zeme" on document_versions
  for insert to authenticated
  with check (public.can_write_for_country(country_id));

-- Kvůli zveřejnění (draft -> published) a přepsání rozpracované verze.
create policy "verzi upravuje admin nebo editor sve zeme" on document_versions
  for update to authenticated
  using (public.can_write_for_country(country_id))
  with check (public.can_write_for_country(country_id));

-- Mazat jde jen rozpracovaná verze, a to vlastní (nebo jako admin).
-- Zveřejněná verze je součást historie a nemaže ji nikdo.
create policy "rozpracovanou verzi maze jeji autor nebo admin" on document_versions
  for delete to authenticated
  using (
    status = 'draft'
    and (uploaded_by = auth.uid() or public.is_admin())
  );

-- ---------------------------------------------------------------------
-- Značky
-- ---------------------------------------------------------------------
-- Dosud stačila role, nehledělo se na zemi. Nově musí značka patřit
-- k verzi, do které uživatel smí zapisovat.

drop policy if exists "znacky zapisuje admin nebo editor" on annotations;
drop policy if exists "znacky upravuje admin nebo editor" on annotations;
drop policy if exists "znacky maze admin nebo editor" on annotations;

create policy "znacky zapisuje kdo smi do verze" on annotations
  for insert to authenticated
  with check (public.can_write_version(document_version_id));

create policy "znacky upravuje kdo smi do verze" on annotations
  for update to authenticated
  using (public.can_write_version(document_version_id))
  with check (public.can_write_version(document_version_id));

create policy "znacky maze kdo smi do verze" on annotations
  for delete to authenticated
  using (public.can_write_version(document_version_id));
