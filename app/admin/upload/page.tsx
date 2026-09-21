import { redirect } from "next/navigation";
import { requireUser, canUpload } from "@/lib/current-user";
import { createClient } from "@/lib/supabase/server";
import { uploadDocumentVersion } from "./actions";

export default async function UploadPage() {
  const user = await requireUser();
  if (!canUpload(user)) redirect("/");

  const supabase = await createClient();
  const { data: modules } = await supabase.from("modules").select("*").order("name");
  const { data: countries } = await supabase.from("countries").select("*").order("name");

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-heading text-3xl font-bold text-ink">Nahrát novou verzi</h1>

      <form action={uploadDocumentVersion} className="flex flex-col gap-4">
        <Field label="Modul">
          <select name="moduleId" required className="input">
            {modules?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Země">
          {user.role === "admin" ? (
            <select name="countryId" required defaultValue={user.country_id ?? ""} className="input">
              {countries?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              {/* Editor může nahrávat jen pro svou vlastní zemi. */}
              <input
                type="hidden"
                name="countryId"
                value={user.country_id ?? ""}
              />
              <p className="input bg-haze/40 text-ink/60">
                {countries?.find((c) => c.id === user.country_id)?.name ?? "Bez přiřazené země"}
              </p>
            </>
          )}
        </Field>

        <Field label="PDF soubor">
          <input type="file" name="file" accept="application/pdf" required className="input" />
        </Field>

        <Field label="Kategorie změny (volitelné)">
          <input
            type="text"
            name="category"
            placeholder="např. oprava, nový obsah, překlad"
            className="input"
          />
        </Field>

        <Field label="Co a proč se změnilo">
          <textarea
            name="note"
            required
            rows={4}
            placeholder="Popiš stručně změnu, ať čtenáři vědí, co se aktualizovalo."
            className="input"
          />
        </Field>

        <button
          type="submit"
          className="mt-2 rounded-xl bg-coral px-4 py-2.5 font-medium text-white transition hover:opacity-90"
        >
          Nahrát a odeslat notifikaci
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
    </label>
  );
}
