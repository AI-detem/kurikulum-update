"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canUpload } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import type { Mark } from "@/lib/types";

// Uloží označená místa u už existující verze. Admin a editor je smí
// přidávat, upravovat i mazat, ostatní ne.
export async function saveAnnotations(
  versionId: string,
  moduleId: string,
  marks: Mark[]
): Promise<{ error: string } | null> {
  const user = await requireUser();
  const { t } = await resolveActiveCountry(user);

  if (!canUpload(user)) return { error: t.uploadNotAllowed };

  const supabase = await createClient();

  // Nejdřív zjistíme, co je uložené teď – ať je co smazat až poté, co
  // se nové značky opravdu zapíšou. Kdyby zápis selhal, o původní
  // popisy uživatel nepřijde.
  const { data: existing, error: readError } = await supabase
    .from("annotations")
    .select("id")
    .eq("document_version_id", versionId);

  if (readError) return { error: `${t.saveFailedDetail} ${readError.message}` };

  const described = marks.filter((mark) => mark.note?.trim());

  if (described.length > 0) {
    const { error: insertError } = await supabase.from("annotations").insert(
      described.map((mark) => ({
        document_version_id: versionId,
        page: mark.page,
        x: mark.x,
        y: mark.y,
        w: mark.w,
        h: mark.h,
        note: mark.note,
        category: mark.category,
      }))
    );

    if (insertError) return { error: `${t.saveFailedDetail} ${insertError.message}` };
  }

  const previousIds = (existing ?? []).map((row) => row.id);
  if (previousIds.length > 0) {
    const { error: deleteError } = await supabase
      .from("annotations")
      .delete()
      .in("id", previousIds);

    if (deleteError) return { error: `${t.saveFailedDetail} ${deleteError.message}` };
  }

  revalidatePath(`/modules/${moduleId}`);
  return null;
}
