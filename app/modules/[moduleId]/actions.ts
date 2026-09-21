"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canUpload } from "@/lib/current-user";
import type { Mark } from "@/lib/types";

// Uloží označená místa u už existující verze. Admin a editor je smí
// přidávat, upravovat i mazat, ostatní ne.
export async function saveAnnotations(
  versionId: string,
  moduleId: string,
  marks: Mark[]
): Promise<{ error: string } | null> {
  const user = await requireUser();
  if (!canUpload(user)) return { error: "forbidden" };

  const supabase = await createClient();

  // Značky nahrazujeme celé – je jich řádově jednotky a je to spolehlivější
  // než párovat, co přibylo a co zmizelo.
  const { error: deleteError } = await supabase
    .from("annotations")
    .delete()
    .eq("document_version_id", versionId);

  if (deleteError) return { error: deleteError.message };

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

    if (insertError) return { error: insertError.message };
  }

  revalidatePath(`/modules/${moduleId}`);
  return null;
}
