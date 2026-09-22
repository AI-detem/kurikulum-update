// Změny, které přišly z jiných zemí, a semafor rozpracovanosti.
//
// Barva semaforu se nikam neukládá – počítá ji pohled module_country_light
// v databázi z data nejstarší nevyřešené změny (viz 0004_country_status.sql).
import { createClient } from "@/lib/supabase/server";
import type { CountryLight, PendingChange } from "@/lib/types";

// Tvar, v jakém řádky vrací PostgREST (vnořené tabulky jako objekt nebo pole).
type StatusRow = {
  id: string;
  created_at: string;
  annotations: {
    id: string;
    page: number;
    note: string;
    category: string | null;
    document_versions: {
      module_id: string;
      version_number: number | null;
      modules: { name: string } | { name: string }[] | null;
      countries: { name: string } | { name: string }[] | null;
    } | null;
  } | null;
};

function one<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

// Nevyřešené změny pro danou zemi, od nejstarší (ty nejvíc hoří jsou nahoře).
export async function getPendingChanges(
  countryId: string,
  moduleId?: string
): Promise<PendingChange[]> {
  const supabase = await createClient();

  // Filtr podle modulu se dělá až tady v kódu – modul visí na vnořené
  // tabulce a dotaz by kvůli němu byl výrazně hůř čitelný.
  const { data, error } = await supabase
    .from("annotation_country_status")
    .select(
      `id, created_at,
       annotations (
         id, page, note, category,
         document_versions (
           module_id, version_number,
           modules (name),
           countries (name)
         )
       )`
    )
    .eq("country_id", countryId)
    .eq("status", "pending")
    .order("created_at");

  if (error || !data) return [];

  return (data as unknown as StatusRow[]).flatMap((row) => {
    const annotation = one(row.annotations);
    const version = one(annotation?.document_versions ?? null);
    if (!annotation || !version) return [];
    if (moduleId && version.module_id !== moduleId) return [];

    return [
      {
        id: row.id,
        annotationId: annotation.id,
        createdAt: row.created_at,
        moduleId: version.module_id,
        moduleName: one(version.modules)?.name ?? "",
        fromCountryName: one(version.countries)?.name ?? "",
        versionNumber: version.version_number,
        page: annotation.page,
        note: annotation.note,
        category: annotation.category,
      },
    ];
  });
}

export async function countPendingChanges(countryId: string): Promise<number> {
  const supabase = await createClient();

  const { count } = await supabase
    .from("annotation_country_status")
    .select("id", { count: "exact", head: true })
    .eq("country_id", countryId)
    .eq("status", "pending");

  return count ?? 0;
}

type LightRow = { module_id: string; country_id: string; light: string };

// Barva semaforu podle modulu pro jednu zemi. Co v mapě není, je zelené.
export async function getLightsForCountry(
  countryId: string
): Promise<Record<string, CountryLight>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("module_country_light")
    .select("module_id, country_id, light")
    .eq("country_id", countryId);

  const lights: Record<string, CountryLight> = {};
  for (const row of (data ?? []) as LightRow[]) {
    lights[row.module_id] = toLight(row.light);
  }
  return lights;
}

// Matice modul × země pro administraci. Klíč je `${moduleId}:${countryId}`.
export async function getLightMatrix(): Promise<Record<string, CountryLight>> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("module_country_light")
    .select("module_id, country_id, light");

  const lights: Record<string, CountryLight> = {};
  for (const row of (data ?? []) as LightRow[]) {
    lights[`${row.module_id}:${row.country_id}`] = toLight(row.light);
  }
  return lights;
}

function toLight(value: string): CountryLight {
  return value === "red" || value === "yellow" ? value : "green";
}

export function lightLabel(
  light: CountryLight,
  t: { lightOk: string; lightWaiting: string; lightAct: string }
): string {
  if (light === "red") return t.lightAct;
  if (light === "yellow") return t.lightWaiting;
  return t.lightOk;
}
