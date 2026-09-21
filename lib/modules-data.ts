// Načtení modulů pro danou zemi včetně nejnovější verze a jejích poznámek,
// pro zobrazení v mřížce karet na hlavní stránce.
import { createClient } from "@/lib/supabase/server";
import type { Mark, ModuleWithLatestVersion } from "@/lib/types";

export async function getModulesForCountry(
  countryId: string
): Promise<ModuleWithLatestVersion[]> {
  const supabase = await createClient();

  const { data: modules, error } = await supabase
    .from("modules")
    .select("*")
    .order("name");

  if (error || !modules) return [];

  const { data: versions } = await supabase
    .from("document_versions")
    .select("*, changes (*)")
    .eq("country_id", countryId)
    .order("version_number", { ascending: false });

  return modules.map((module) => {
    const moduleVersions = (versions ?? []).filter((v) => v.module_id === module.id);
    const latest = moduleVersions[0] ?? null;

    return {
      ...module,
      latest_version: latest
        ? { ...latest, changes: [...latest.changes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)) }
        : null,
      version_count: moduleVersions.length,
    };
  });
}

export async function getModuleDetail(moduleId: string, countryId: string) {
  const supabase = await createClient();

  const { data: module } = await supabase
    .from("modules")
    .select("*")
    .eq("id", moduleId)
    .single();

  const { data: versions } = await supabase
    .from("document_versions")
    .select("*, changes (*)")
    .eq("module_id", moduleId)
    .eq("country_id", countryId)
    .order("version_number", { ascending: false });

  // Označená místa v dokumentu, seskupená podle verze.
  const { data: annotations } = await supabase
    .from("annotations")
    .select("*")
    .in("document_version_id", (versions ?? []).map((v) => v.id));

  const marksByVersion: Record<string, Mark[]> = {};
  for (const annotation of annotations ?? []) {
    const mark: Mark = {
      id: annotation.id,
      page: annotation.page,
      x: annotation.x,
      y: annotation.y,
      w: annotation.w,
      h: annotation.h,
      note: annotation.note,
      category: annotation.category,
    };
    marksByVersion[annotation.document_version_id] = [
      ...(marksByVersion[annotation.document_version_id] ?? []),
      mark,
    ];
  }

  // file_url je hotový odkaz na náhled souboru v Google Drive, takže se
  // používá rovnou tak, jak je uložený.
  return {
    module,
    versions: (versions ?? []).map((v) => ({
      ...v,
      changes: [...v.changes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
    })),
    marksByVersion,
  };
}
