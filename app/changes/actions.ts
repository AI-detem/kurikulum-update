"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/current-user";

// "Netýká se nás". Odbavuje se až po uplynutí lhůty na vrácení zpět,
// takže sem přijde jen změna, kterou uživatel opravdu chtěl odbavit.
// Podmínka na status='pending' zároveň zaručí, že opakované zavolání
// (například z odchodu ze stránky i z časovače) nic nepokazí.
export async function dismissChange(statusId: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("annotation_country_status")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
      dismissed_by: user.id,
    })
    .eq("id", statusId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  revalidatePath("/changes");
  revalidatePath("/");
  return {};
}
