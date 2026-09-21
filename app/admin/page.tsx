import { requireAdmin } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { addCountry, inviteUser, updateUserRoleAndCountry } from "./actions";
import type { Country, AppUser } from "@/lib/types";

export default async function AdminPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: countries } = await supabase.from("countries").select("*").order("name");
  const { data: users } = await supabase.from("users").select("*").order("email");

  return (
    <div className="flex max-w-3xl flex-col gap-10">
      <h1 className="font-heading text-3xl font-bold text-ink">Administrace</h1>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-ink">Země</h2>
        <ul className="mb-4 flex flex-wrap gap-2">
          {countries?.map((c) => (
            <li key={c.id} className="badge-pill">
              {c.name} ({c.locale})
            </li>
          ))}
        </ul>
        <form action={addCountry} className="flex gap-2">
          <input name="name" placeholder="Název země" required className="input flex-1" />
          <input name="locale" placeholder="jazyk (cs, sk, en...)" required className="input w-40" />
          <button type="submit" className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white hover:opacity-90">
            Přidat zemi
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-xl font-bold text-ink">Uživatelé</h2>
        <UsersTable users={users ?? []} countries={countries ?? []} />

        <h3 className="mb-2 mt-6 text-sm font-semibold text-ink/70">Pozvat nového uživatele</h3>
        <form action={inviteUser} className="flex flex-wrap gap-2">
          <input name="email" type="email" placeholder="e-mail" required className="input flex-1" />
          <select name="countryId" required className="input">
            {countries?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="role" required defaultValue="viewer" className="input">
            <option value="viewer">viewer (čtenář)</option>
            <option value="editor">editor</option>
            <option value="admin">admin</option>
          </select>
          <button type="submit" className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white hover:opacity-90">
            Pozvat
          </button>
        </form>
      </section>
    </div>
  );
}

function UsersTable({ users, countries }: { users: AppUser[]; countries: Country[] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="dashed-divider text-ink/50">
          <th className="py-2 font-medium">E-mail</th>
          <th className="py-2 font-medium">Země / role</th>
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
                  <option value="viewer">viewer</option>
                  <option value="editor">editor</option>
                  <option value="admin">admin</option>
                </select>
                <button type="submit" className="text-coral hover:underline">
                  Uložit
                </button>
              </form>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
