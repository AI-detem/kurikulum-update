"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canUpload } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { extractDriveFileId, drivePreviewUrl } from "@/lib/drive";
import { notifyCountryAboutChange } from "@/lib/notify";

// Formulář chybu zobrazí pod tlačítkem, proto ji vracíme místo vyhazování.
export type UploadState = { error: string } | null;

export async function uploadDocumentVersion(
  _prevState: UploadState,
  formData: FormData
): Promise<UploadState> {
  const user = await requireUser();

  const moduleId = String(formData.get("moduleId") ?? "");
  const countryId = String(formData.get("countryId") ?? "");
  const driveLink = String(formData.get("driveLink") ?? "");
  const note = String(formData.get("note") ?? "");
  const category = String(formData.get("category") ?? "") || null;

  // Hlášky posíláme v jazyce země, pro kterou se verze přidává.
  const { t } = await resolveActiveCountry(user, countryId);

  if (!canUpload(user)) return { error: t.uploadNotAllowed };
  if (!moduleId || !countryId || !driveLink || !note) {
    return { error: t.uploadMissingFields };
  }

  const fileId = extractDriveFileId(driveLink);
  if (!fileId) return { error: t.driveLinkNotRecognized };

  const supabase = await createClient();

  // Zjistíme, jaké je poslední číslo verze pro tento modul a zemi.
  const { data: lastVersion } = await supabase
    .from("document_versions")
    .select("version_number")
    .eq("module_id", moduleId)
    .eq("country_id", countryId)
    .order("version_number", { ascending: false })
    .limit(1)
    .single();

  const nextVersionNumber = (lastVersion?.version_number ?? 0) + 1;

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      module_id: moduleId,
      country_id: countryId,
      file_url: drivePreviewUrl(fileId),
      version_number: nextVersionNumber,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (versionError || !version) {
    return { error: `${t.saveFailed} ${versionError?.message ?? ""}`.trim() };
  }

  const { data: change, error: changeError } = await supabase
    .from("changes")
    .insert({ document_version_id: version.id, note, category })
    .select()
    .single();

  if (changeError || !change) {
    return { error: `${t.saveFailed} ${changeError?.message ?? ""}`.trim() };
  }

  // Notifikace (in-app + e-mail) posíláme až po úspěšném uložení všeho ostatního.
  const [{ data: moduleData }, { data: countryData }] = await Promise.all([
    supabase.from("modules").select("name").eq("id", moduleId).single(),
    supabase.from("countries").select("name").eq("id", countryId).single(),
  ]);

  await notifyCountryAboutChange({
    changeId: change.id,
    countryId,
    countryName: countryData?.name ?? "",
    moduleName: moduleData?.name ?? "",
    versionNumber: nextVersionNumber,
    note,
  });

  revalidatePath("/");
  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}?country=${countryId}`);
}
