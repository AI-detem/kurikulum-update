import { redirect } from "next/navigation";
import { requireUser, canUpload } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { createClient } from "@/lib/supabase/server";
import { UploadWorkspace, type LatestVersion } from "@/components/UploadWorkspace";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const user = await requireUser();
  if (!canUpload(user)) redirect("/");

  const { country } = await searchParams;
  const { activeCountryId, t } = await resolveActiveCountry(user, country);

  const supabase = await createClient();
  const { data: modules } = await supabase.from("modules").select("*").order("name");
  const { data: countries } = await supabase.from("countries").select("*").order("name");

  // Poslední verze pro každou dvojici modul + země, ať je na obrazovce vidět,
  // na co se navazuje a jaké číslo nová verze dostane.
  const { data: versions } = await supabase
    .from("document_versions")
    .select("module_id, country_id, version_number, uploaded_at, users:uploaded_by (email)")
    .order("version_number", { ascending: false });

  const latestVersions: LatestVersion[] = [];
  for (const version of versions ?? []) {
    const already = latestVersions.some(
      (item) => item.module_id === version.module_id && item.country_id === version.country_id
    );
    if (already) continue;
    const uploader = Array.isArray(version.users) ? version.users[0] : version.users;
    latestVersions.push({
      module_id: version.module_id,
      country_id: version.country_id,
      version_number: version.version_number,
      uploaded_at: version.uploaded_at,
      uploaded_by_email: uploader?.email ?? null,
    });
  }

  return (
    <div>
      <h1 className="mb-6 font-heading text-3xl font-bold text-ink">{t.uploadNewVersion}</h1>

      <UploadWorkspace
        modules={modules ?? []}
        countries={countries ?? []}
        defaultCountryId={user.role === "admin" ? activeCountryId : user.country_id}
        canChooseCountry={user.role === "admin"}
        latestVersions={latestVersions}
        t={t}
      />
    </div>
  );
}
