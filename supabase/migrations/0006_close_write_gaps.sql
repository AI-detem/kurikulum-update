-- Dvě díry v oprávněních, které našla kontrola zápisů proti pravidlům.
-- Spustit v Supabase: SQL Editor -> New query -> vlož celý soubor -> Run

-- ---------------------------------------------------------------------
-- 1. Uživatel si mohl sám přepsat roli na admin
-- ---------------------------------------------------------------------
-- První migrace měla pravidlo nazvané "bez zmeny role", jenže RLS umí
-- hlídat jen celé řádky, ne jednotlivé sloupce, a chyběla mu i podmínka
-- na výsledný řádek. Kdokoli přihlášený tak mohl svému řádku v tabulce
-- users nastavit role = 'admin' – stačil k tomu veřejný anon klíč, který
-- appka posílá do prohlížeče, a vlastní přihlášení.
--
-- Appka nikde nepotřebuje, aby si uživatel upravoval vlastní řádek;
-- zemi i roli nastavuje admin v Administraci. Pravidlo proto ruším celé.

drop policy if exists "uzivatel si upravi jen sebe (bez zmeny role)" on users;

-- ---------------------------------------------------------------------
-- 2. Editor mohl přidat shrnutí k verzi cizí země
-- ---------------------------------------------------------------------
-- U shrnutí verze se dosud hlídala jen role, ne země. Editor tak mohl
-- připsat text k verzi, která patří jiné zemi. Nově platí stejná
-- podmínka jako u značek.

drop policy if exists "zmeny zapisuje admin nebo editor" on changes;

create policy "zmeny zapisuje kdo smi do verze" on changes
  for insert to authenticated
  with check (public.can_write_version(document_version_id));

-- ---------------------------------------------------------------------
-- 3. Drobnost: notifikace si šlo přepsat na cizího vlastníka
-- ---------------------------------------------------------------------
-- Pravidlo na označení přečteno kontrolovalo jen původní řádek, ne ten
-- výsledný, takže šlo vlastní notifikaci přepsat na jiného uživatele.

drop policy if exists "notifikace oznaci precteno jen vlastnik" on notifications;

create policy "notifikace oznaci precteno jen vlastnik" on notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
