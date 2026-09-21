// Načtení modulů pro danou zemi včetně nejnovější verze a jejích poznámek,
// pro zobrazení v mřížce karet na hlavní stránce.
import { createClient } from "@/lib/supabase/server";
import type { ModuleWithLatestVersion } from "@/lib/types";

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

  // file_url v databázi je jen cesta v privátním bucketu – pro zobrazení
  // potřebujeme dočasný (1 hodinu platný) podepsaný odkaz ke stažení.
  const versionsWithSignedUrls = await Promise.all(
    (versions ?? []).map(async (v) => {
      const { data: signed } = await supabase.storage
        .from("documents")
        .createSignedUrl(v.file_url, 60 * 60);

      return {
        ...v,
        file_url: signed?.signedUrl ?? "",
        changes: [...v.changes].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)),
      };
    })
  );

  return { module, versions: versionsWithSignedUrls };
}
