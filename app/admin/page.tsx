import Link from "next/link";
import { requireAdmin } from "@/lib/current-user";
import { missingMigrations } from "@/lib/schema-check";
import { mailConfigured } from "@/lib/resend";
import { AdminNotices } from "@/components/AdminNotices";
import { resolveActiveCountry } from "@/lib/active-country";
import { createClient } from "@/lib/supabase/server";
import { getLightMatrix, lightLabel } from "@/lib/country-status";
import { StatusDot } from "@/components/StatusDot";
import { CatalogImport } from "@/components/CatalogImport";
import { TestEmailButton } from "@/components/TestEmailButton";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { ActionForm } from "@/components/ActionForm";
import {
  addCountry,
  addModule,
  deleteModule,
  inviteUser,
  setModuleArchived,
  updateModule,
  updateUserRoleAndCountries,
  startPreview,
} from "./actions";
import type { Country, AppUser, CountryLight, Module } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const user = await requireAdmin();
  const { country } = await searchParams;
  const { t } = await resolveActiveCountry(user, country);

  const supabase = await createClient();
  const { data: countries } = await supabase.from("countries").select("*").order("name");
  const { data: users } = await supabase.from("users").select("*").order("email");

  // Přiřazení zemí k uživatelům (jeden uživatel jich může mít víc).
  const { data: vazby } = await supabase.from("user_countries").select("user_id, country_id");
  const countryIds = new Map<string, string[]>();
  for (const vazba of vazby ?? []) {
    countryIds.set(vazba.user_id, [...(countryIds.get(vazba.user_id) ?? []), vazba.country_id]);
  }
  const { data: vsechnyModuly } = await supabase
    .from("modules")
    .select("*")
    .order("category")
    .order("order_index")
    .order("name");
  const lights = await getLightMatrix();

  // Kolik verzí má která metodika – podle toho se rozhoduje, jestli jde smazat.
  const { data: verze } = await supabase.from("document_versions").select("module_id");
  const pocetVerzi = new Map<string, number>();
  for (const v of verze ?? []) {
    pocetVerzi.set(v.module_id, (pocetVerzi.get(v.module_id) ?? 0) + 1);
  }

  const moduly = (vsechnyModuly ?? []) as Module[];
  const modules = moduly.filter((m) => !m.archived_at);

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <h1 className="font-heading text-3xl font-bold text-ink">{t.admin}</h1>

      <AdminNotices
        missing={await missingMigrations()}
        mailConfigured={mailConfigured()}
        t={t}
      />

      <section>
        <h2 className="mb-1 font-heading text-xl font-bold text-ink">{t.readiness}</h2>
        <p className="mb-3 text-xs text-ink/50">{t.readinessHint}</p>
        <ReadinessMatrix
          modules={modules ?? []}
          countries={countries ?? []}
          lights={lights}
          t={t}
        />
      </section>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-ink">{t.catalogTitle}</h2>
        <CatalogImport t={t} />

        <h3 className="mb-2 mt-6 text-sm font-semibold text-ink/70">{t.methodologies}</h3>
        <ModulesTable modules={moduly} pocetVerzi={pocetVerzi} t={t} />

        <h3 className="mb-2 mt-6 text-sm font-semibold text-ink/70">{t.addModule}</h3>
        <ActionForm action={addModule} className="flex flex-wrap gap-2">
          <input name="name" placeholder={t.moduleName} required className="input flex-1" />
          <input name="category" placeholder={t.moduleSection} className="input w-56" />
          <input name="nameEn" placeholder={t.moduleNameEn} className="input w-56" />
          <button
            type="submit"
            className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white hover:opacity-90"
          >
            {t.addModule}
          </button>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-ink">{t.countries}</h2>
        <ul className="mb-4 flex flex-wrap gap-2">
          {countries?.map((c) => (
            <li key={c.id} className="badge-pill">
              {c.name} ({c.locale})
            </li>
          ))}
        </ul>
        <ActionForm action={addCountry} className="flex gap-2">
          <input name="name" placeholder={t.countryName} required className="input flex-1" />
          <input name="locale" placeholder={t.languageCode} required className="input w-40" />
          <button
            type="submit"
            className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white hover:opacity-90"
          >
            {t.addCountry}
          </button>
        </ActionForm>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-ink">{t.users}</h2>
        <UsersTable
          users={users ?? []}
          countries={countries ?? []}
          countryIds={countryIds}
          t={t}
        />

        <h3 className="mb-2 mt-6 text-sm font-semibold text-ink/70">{t.inviteUser}</h3>
        <ActionForm action={inviteUser} className="flex flex-wrap gap-2">
          <input
            name="email"
            type="email"
            placeholder={t.email}
            required
            className="input flex-1"
          />
          <CountryChecks countries={countries ?? []} selected={[]} />
          {/* Role "čtenář" se nově nezvou – editor má práva jen ve své zemi.
              Existující čtenáři zůstávají, jak jsou. */}
          <select name="role" required defaultValue="editor" className="input">
            <option value="editor">{t.roleEditor}</option>
            <option value="admin">{t.roleAdmin}</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white hover:opacity-90"
          >
            {t.invite}
          </button>
        </ActionForm>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-ink/70">{t.previewAsEditor}</h3>
        <p className="mb-2 text-xs text-ink/50">{t.previewHint}</p>
        <ActionForm action={startPreview} className="flex flex-wrap gap-2">
          <select name="countryId" required className="input">
            {countries?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl border border-haze px-4 py-2.5 text-sm text-ink hover:border-coral"
          >
            {t.previewAsEditor}
          </button>
        </ActionForm>

        <h3 className="mb-2 mt-6 text-sm font-semibold text-ink/70">{t.testEmail}</h3>
        <TestEmailButton t={t} />
      </section>
    </div>
  );
}

function UsersTable({
  users,
  countries,
  countryIds,
  t,
}: {
  users: AppUser[];
  countries: Country[];
  /** Země podle uživatele. */
  countryIds: Map<string, string[]>;
  t: Dictionary;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="dashed-divider text-ink/50">
          <th className="py-2 font-medium">{t.email}</th>
          <th className="py-2 font-medium">{t.countryAndRole} / {t.uiLanguage}</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="dashed-divider">
            <td className="py-2">{u.email}</td>
            <td className="py-2">
              <ActionForm action={updateUserRoleAndCountries} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <CountryChecks countries={countries} selected={countryIds.get(u.id) ?? []} />
                <select name="locale" defaultValue={u.locale ?? ""} className="input py-1">
                  <option value="">{t.byCountry}</option>
                  <option value="cs">cs</option>
                  <option value="sk">sk</option>
                  <option value="en">en</option>
                  <option value="hu">hu</option>
                </select>
                <select name="role" defaultValue={u.role} className="input py-1">
                  {u.role === "viewer" && <option value="viewer">{t.roleViewer}</option>}
                  <option value="editor">{t.roleEditor}</option>
                  <option value="admin">{t.roleAdmin}</option>
                </select>
                <button type="submit" className="text-coral hover:underline">
                  {t.save}
                </button>
              </ActionForm>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// Matice metodika × země. Klik na tečku otevře seznam změn té země
// omezený na tu metodiku.
function ReadinessMatrix({
  modules,
  countries,
  lights,
  t,
}: {
  modules: Module[];
  countries: Country[];
  lights: Record<string, CountryLight>;
  t: Dictionary;
}) {
  if (modules.length === 0 || countries.length === 0) {
    return <p className="text-sm text-ink/50">{t.noModules}</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="dashed-divider text-ink/50">
            <th className="py-2 font-medium">{t.moduleColumn}</th>
            {countries.map((country) => (
              <th key={country.id} className="px-3 py-2 text-center font-medium">
                {country.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {modules.map((module) => (
            <tr key={module.id} className="dashed-divider">
              <td className="py-2 pr-3">{module.name}</td>
              {countries.map((country) => {
                const light = lights[`${module.id}:${country.id}`] ?? "green";
                return (
                  <td key={country.id} className="px-3 py-2 text-center">
                    <Link
                      href={`/?country=${country.id}&module=${module.id}`}
                      className="inline-flex rounded-full p-1 hover:bg-haze"
                    >
                      <StatusDot light={light} label={lightLabel(light, t)} size={12} />
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Seznam metodik. Přejmenovat a zařadit jde i ručně, hlavní cesta je ale
// import z webu. Mazat jde jen metodika bez jediné verze – jinak archivace.
function ModulesTable({
  modules,
  pocetVerzi,
  t,
}: {
  modules: Module[];
  pocetVerzi: Map<string, number>;
  t: Dictionary;
}) {
  if (modules.length === 0) {
    return <p className="text-sm text-ink/50">{t.noModules}</p>;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {modules.map((module) => {
        const maVerze = (pocetVerzi.get(module.id) ?? 0) > 0;
        const archivovana = Boolean(module.archived_at);

        return (
          <div
            key={module.id}
            className={`flex flex-wrap items-center gap-2 rounded-xl border border-haze p-2 ${
              archivovana ? "opacity-50" : ""
            }`}
          >
            <ActionForm action={updateModule} className="flex flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="moduleId" value={module.id} />
              <input
                name="name"
                defaultValue={module.name}
                required
                className="input min-w-48 flex-1 py-1"
              />
              <input
                name="category"
                defaultValue={module.category ?? ""}
                placeholder={t.moduleSection}
                className="input w-48 py-1"
              />
              <input
                name="nameEn"
                defaultValue={module.name_en ?? ""}
                placeholder={t.moduleNameEn}
                className="input w-48 py-1"
              />
              <button type="submit" className="text-sm text-coral hover:underline">
                {t.save}
              </button>
            </ActionForm>

            {archivovana && <span className="badge-pill">{t.archivedLabel}</span>}

            <ActionForm action={setModuleArchived}>
              <input type="hidden" name="moduleId" value={module.id} />
              <input type="hidden" name="archived" value={archivovana ? "0" : "1"} />
              {/* Vracet z archivu je neškodné, potvrzuje se jen archivace. */}
              {archivovana ? (
                <button type="submit" className="text-sm text-ink/50 hover:text-ink">
                  {t.unarchiveModule}
                </button>
              ) : (
                <ConfirmSubmit
                  label={t.archiveModule}
                  title={t.confirmArchiveTitle}
                  explanation={t.confirmArchiveExplain}
                  confirmLabel={t.confirmArchiveYes}
                  detail={module.name}
                  className="text-sm text-ink/50 hover:text-ink"
                  t={t}
                />
              )}
            </ActionForm>

            {maVerze ? (
              <span className="text-xs text-ink/40">{t.cannotDeleteModule}</span>
            ) : (
              <ActionForm action={deleteModule}>
                <input type="hidden" name="moduleId" value={module.id} />
                <ConfirmSubmit
                  label={t.delete}
                  title={t.confirmDeleteModuleTitle}
                  explanation={t.confirmDeleteModuleExplain}
                  confirmLabel={t.confirmDeleteYes}
                  detail={module.name}
                  t={t}
                />
              </ActionForm>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Země se u uživatele vybírají zaškrtávátky – jeden účet může spravovat
// víc zemí (například Česko i anglickou verzi).
function CountryChecks({
  countries,
  selected,
}: {
  countries: Country[];
  selected: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      {countries.map((country) => (
        <label key={country.id} className="flex items-center gap-1.5 text-sm text-ink">
          <input
            type="checkbox"
            name="countryIds"
            value={country.id}
            defaultChecked={selected.includes(country.id)}
            className="accent-coral"
          />
          {country.name}
        </label>
      ))}
    </div>
  );
}
