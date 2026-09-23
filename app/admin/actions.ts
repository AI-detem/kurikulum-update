"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/current-user";
import type { UserRole } from "@/lib/types";

export async function addCountry(formData: FormData) {
  await requireAdmin();

  const name = formData.get("name") as string;
  const locale = formData.get("locale") as string;
  if (!name || !locale) throw new Error("Vyplň prosím název země i jazykový kód.");

  const supabase = await createClient();
  const { error } = await supabase.from("countries").insert({ name, locale });
  if (error) throw new Error(`Přidání země selhalo: ${error.message}`);

  revalidatePath("/admin");
}

export async function inviteUser(formData: FormData) {
  await requireAdmin();

  const email = formData.get("email") as string;
  const countryId = formData.get("countryId") as string;
  const role = formData.get("role") as UserRole;
  if (!email || !countryId || !role) {
    throw new Error("Vyplň prosím e-mail, zemi i roli.");
  }

  // Service role klíč je potřeba pro pozvání nového uživatele (vytvoří se
  // mu záznam v auth.users a pošle se mu e-mail s přihlašovacím odkazem).
  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });

  if (error || !data.user) {
    throw new Error(`Pozvání uživatele selhalo: ${error?.message}`);
  }

  // Databázový trigger (viz supabase/migrations/0001_init.sql) při pozvání
  // automaticky založí řádek v public.users – tady mu jen doplníme zemi a roli.
  const { error: updateError } = await adminClient
    .from("users")
    .update({ country_id: countryId, role })
    .eq("id", data.user.id);

  if (updateError) {
    throw new Error(`Nastavení role/země selhalo: ${updateError.message}`);
  }

  revalidatePath("/admin");
}

export async function updateUserRoleAndCountry(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("userId") as string;
  const countryId = formData.get("countryId") as string;
  const role = formData.get("role") as UserRole;

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ country_id: countryId, role })
    .eq("id", userId);

  if (error) throw new Error(`Úprava uživatele selhala: ${error.message}`);

  revalidatePath("/admin");
}

// ---------------------------------------------------------------------
// Metodiky
// ---------------------------------------------------------------------
// Hlavní cesta je import z kurikulum.aidetem.cz (viz catalog-actions.ts).
// Tohle je ruční záchrana pro případ, kdy web zdrojem být nemůže.

export async function addModule(formData: FormData) {
  await requireAdmin();

  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  if (!name) throw new Error("Vyplň prosím název metodiky.");

  const supabase = await createClient();
  const { error } = await supabase.from("modules").insert({
    name,
    category: category || null,
    name_en: nameEn || null,
  });
  if (error) throw new Error(`Přidání metodiky selhalo: ${error.message}`);

  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateModule(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("moduleId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  if (!id || !name) throw new Error("Vyplň prosím název metodiky.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("modules")
    .update({ name, category: category || null, name_en: nameEn || null })
    .eq("id", id);
  if (error) throw new Error(`Úprava metodiky selhala: ${error.message}`);

  revalidatePath("/admin");
  revalidatePath("/");
}

// Archivovaná metodika se nikde nenabízí, ale nic se jí nestane –
// verze i vyznačené změny zůstávají.
export async function setModuleArchived(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("moduleId") ?? "");
  const archived = formData.get("archived") === "1";
  if (!id) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("modules")
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw new Error(`Změna se nepodařila: ${error.message}`);

  revalidatePath("/admin");
  revalidatePath("/");
}

// Smazat jde jen metodika, ke které ještě není žádná verze. Jinak by se
// s ní ztratila i historie – od toho je archivace.
export async function deleteModule(formData: FormData) {
  await requireAdmin();

  const id = String(formData.get("moduleId") ?? "");
  if (!id) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("document_versions")
    .select("id", { count: "exact", head: true })
    .eq("module_id", id);

  if ((count ?? 0) > 0) {
    throw new Error("Metodika má nahrané verze, smazat nejde. Použij archivaci.");
  }

  const { error } = await supabase.from("modules").delete().eq("id", id);
  if (error) throw new Error(`Smazání metodiky selhalo: ${error.message}`);

  revalidatePath("/admin");
  revalidatePath("/");
}
