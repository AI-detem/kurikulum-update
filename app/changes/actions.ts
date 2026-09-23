"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/current-user";

// "Netýká se nás". Zápis je vratný – vrácení zpět řeší restoreChange,
// buď hned z lišty, nebo kdykoli později ze záložky Skryté.
// Podmínka na status zaručí, že opakované zavolání nic nepokazí.
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

  revalidatePath("/");
  return {};
}

// Vrácení mezi aktuální. Stopy po skrytí se mažou, ať je řádek ve stejném
// stavu, v jakém přišel – jinak by se ze semaforu nedalo poznat, co je nové.
export async function restoreChange(statusId: string): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("annotation_country_status")
    .update({ status: "pending", dismissed_at: null, dismissed_by: null })
    .eq("id", statusId)
    .eq("status", "dismissed");

  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}
