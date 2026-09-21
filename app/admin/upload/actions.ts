"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canUpload } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { extractDriveFileId, drivePreviewUrl } from "@/lib/drive";
import { sortMarks } from "@/lib/annotations";
import { notifyCountryAboutChange } from "@/lib/notify";
import type { Mark } from "@/lib/types";

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
  const summary = String(formData.get("note") ?? "").trim();
  const marks = parseMarks(formData.get("marks"));

  // Hlášky posíláme v jazyce země, pro kterou se verze přidává.
  const { t } = await resolveActiveCountry(user, countryId);

  if (!canUpload(user)) return { error: t.uploadNotAllowed };
  if (!moduleId || !countryId || !driveLink) {
    return { error: t.uploadMissingFields };
  }

  // Popis změn musí být aspoň jeden – buď u konkrétního místa, nebo celkový.
  if (marks.length === 0 && !summary) {
    return { error: t.needMarkOrSummary };
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

  // Popisy označených míst v pořadí čtení – použijí se i v e-mailu.
  const noteList = sortMarks(marks).map((mark) => mark.note);

  if (marks.length > 0) {
    const { error: marksError } = await supabase.from("annotations").insert(
      sortMarks(marks).map((mark) => ({
        document_version_id: version.id,
        page: mark.page,
        x: mark.x,
        y: mark.y,
        w: mark.w,
        h: mark.h,
        note: mark.note,
        category: mark.category,
      }))
    );

    if (marksError) {
      return { error: `${t.saveFailed} ${marksError.message}`.trim() };
    }
  }

  const { data: change, error: changeError } = await supabase
    .from("changes")
    .insert({
      document_version_id: version.id,
      note: summary || noteList.map((note, index) => `${index + 1}. ${note}`).join("\n"),
      category: null,
    })
    .select()
    .single();

  if (changeError || !change) {
    return { error: `${t.saveFailed} ${changeError?.message ?? ""}`.trim() };
  }

  // Notifikace posíláme až úplně nakonec, aby čtenářům nepřišlo upozornění
  // na verzi, u které se popisy neuložily.
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
    summary,
    notes: noteList,
  });

  revalidatePath("/");
  revalidatePath(`/modules/${moduleId}`);
  redirect(`/modules/${moduleId}?country=${countryId}`);
}

function parseMarks(value: FormDataEntryValue | null): Mark[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value) as Mark[];
    // Bez popisu se značka neukládá.
    return parsed.filter((mark) => mark.note?.trim());
  } catch {
    return [];
  }
}
