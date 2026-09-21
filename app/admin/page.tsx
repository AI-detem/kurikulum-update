import { requireAdmin } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { createClient } from "@/lib/supabase/server";
import { addCountry, inviteUser, updateUserRoleAndCountry } from "./actions";
import type { Country, AppUser } from "@/lib/types";
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

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <h1 className="font-heading text-3xl font-bold text-ink">{t.admin}</h1>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-ink">{t.countries}</h2>
        <ul className="mb-4 flex flex-wrap gap-2">
          {countries?.map((c) => (
            <li key={c.id} className="badge-pill">
              {c.name} ({c.locale})
            </li>
          ))}
        </ul>
        <form action={addCountry} className="flex gap-2">
          <input name="name" placeholder={t.countryName} required className="input flex-1" />
          <input name="locale" placeholder={t.languageCode} required className="input w-40" />
          <button
            type="submit"
            className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white hover:opacity-90"
          >
            {t.addCountry}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-ink">{t.users}</h2>
        <UsersTable users={users ?? []} countries={countries ?? []} t={t} />

        <h3 className="mb-2 mt-6 text-sm font-semibold text-ink/70">{t.inviteUser}</h3>
        <form action={inviteUser} className="flex flex-wrap gap-2">
          <input
            name="email"
            type="email"
            placeholder={t.email}
            required
            className="input flex-1"
          />
          <select name="countryId" required className="input">
            {countries?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="role" required defaultValue="viewer" className="input">
            <option value="viewer">{t.roleViewer}</option>
            <option value="editor">{t.roleEditor}</option>
            <option value="admin">{t.roleAdmin}</option>
          </select>
          <button
            type="submit"
            className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white hover:opacity-90"
          >
            {t.invite}
          </button>
        </form>
      </section>
    </div>
  );
}

function UsersTable({
  users,
  countries,
  t,
}: {
  users: AppUser[];
  countries: Country[];
  t: Dictionary;
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="dashed-divider text-ink/50">
          <th className="py-2 font-medium">{t.email}</th>
          <th className="py-2 font-medium">{t.countryAndRole}</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id} className="dashed-divider">
            <td className="py-2">{u.email}</td>
            <td className="py-2">
              <form action={updateUserRoleAndCountry} className="flex gap-2">
                <input type="hidden" name="userId" value={u.id} />
                <select name="countryId" defaultValue={u.country_id ?? ""} className="input py-1">
                  <option value="">–</option>
                  {countries.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select name="role" defaultValue={u.role} className="input py-1">
                  <option value="viewer">{t.roleViewer}</option>
                  <option value="editor">{t.roleEditor}</option>
                  <option value="admin">{t.roleAdmin}</option>
                </select>
                <button type="submit" className="text-coral hover:underline">
                  {t.save}
                </button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
