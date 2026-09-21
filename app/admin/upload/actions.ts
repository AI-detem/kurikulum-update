"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canUpload } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { extractDriveFileId, drivePreviewUrl } from "@/lib/drive";
import { sortMarks } from "@/lib/annotations";
import { notifyCountryAboutChange, notifyPreviousAuthor } from "@/lib/notify";
import type { Mark } from "@/lib/types";

export type UploadState =
  | { error: string }
  | {
      // Uložilo se, ale mezitím někdo jiný přidal vlastní verzi.
      warning: {
        otherVersion: number;
        otherAuthor: string;
        otherUploadedAt: string;
        savedVersion: number;
        moduleId: string;
        countryId: string;
      };
    }
  | null;

// Kolikrát zkusíme zápis znovu, když nám někdo souběžně vezme číslo verze.
const VERSION_ATTEMPTS = 5;

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
  // Nejvyšší číslo verze, které uživatel viděl na obrazovce.
  const knownLatest = Number(formData.get("knownLatest") ?? 0);

  const { t } = await resolveActiveCountry(user, countryId);

  if (!canUpload(user)) return { error: t.uploadNotAllowed };
  if (!moduleId || !countryId || !driveLink) return { error: t.uploadMissingFields };
  if (marks.length === 0 && !summary) return { error: t.needMarkOrSummary };

  const fileId = extractDriveFileId(driveLink);
  if (!fileId) return { error: t.driveLinkNotRecognized };

  const supabase = await createClient();

  // Číslo verze nepřidělujeme dopředu: pokaždé se načte to poslední a zapíše
  // se o jedno vyšší. Souběžný zápis odmítne databáze (dvojice modul+země+číslo
  // je unikátní), takže to zkusíme znovu s novým číslem.
  let version = null;
  let previous: { version_number: number; uploaded_at: string; uploaded_by: string | null } | null =
    null;
  let lastError = "";

  for (let attempt = 0; attempt < VERSION_ATTEMPTS && !version; attempt++) {
    const { data: latest } = await supabase
      .from("document_versions")
      .select("version_number, uploaded_at, uploaded_by")
      .eq("module_id", moduleId)
      .eq("country_id", countryId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    previous = latest ?? null;

    const { data, error } = await supabase
      .from("document_versions")
      .insert({
        module_id: moduleId,
        country_id: countryId,
        file_url: drivePreviewUrl(fileId),
        version_number: (latest?.version_number ?? 0) + 1,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (data) {
      version = data;
    } else {
      lastError = error?.message ?? "";
      // 23505 = číslo verze mezitím zabral někdo jiný, zkusíme další.
      if (error?.code !== "23505") break;
    }
  }

  if (!version) return { error: `${t.saveFailedDetail} ${lastError}`.trim() };

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

    if (marksError) return { error: `${t.saveFailedDetail} ${marksError.message}` };
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
    return { error: `${t.saveFailedDetail} ${changeError?.message ?? ""}`.trim() };
  }

  const [{ data: moduleData }, { data: countryData }] = await Promise.all([
    supabase.from("modules").select("name").eq("id", moduleId).single(),
    supabase.from("countries").select("name").eq("id", countryId).single(),
  ]);

  // Notifikace posíláme až úplně nakonec, aby čtenářům nepřišlo upozornění
  // na verzi, u které se popisy neuložily.
  await notifyCountryAboutChange({
    changeId: change.id,
    countryId,
    countryName: countryData?.name ?? "",
    moduleName: moduleData?.name ?? "",
    versionNumber: version.version_number,
    uploadedAt: version.uploaded_at,
    summary,
    notes: noteList,
  });

  // Autor předchozí verze se dozví, že k ní přibyla novější.
  if (previous?.uploaded_by && previous.uploaded_by !== user.id) {
    await notifyPreviousAuthor({
      changeId: change.id,
      authorId: previous.uploaded_by,
      moduleName: moduleData?.name ?? "",
      theirVersion: previous.version_number,
      newVersion: version.version_number,
    });
  }

  revalidatePath("/");
  revalidatePath(`/modules/${moduleId}`);

  // Když mezitím přibyla cizí verze, nepřesměrováváme – uživatel se to má
  // dozvědět hned a rozhodnout se, jestli se úpravy nepřekrývají.
  if (previous && previous.version_number > knownLatest && previous.uploaded_by !== user.id) {
    const { data: author } = await supabase
      .from("users")
      .select("email")
      .eq("id", previous.uploaded_by ?? "")
      .maybeSingle();

    return {
      warning: {
        otherVersion: previous.version_number,
        otherAuthor: author?.email ?? "",
        otherUploadedAt: previous.uploaded_at,
        savedVersion: version.version_number,
        moduleId,
        countryId,
      },
    };
  }

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
