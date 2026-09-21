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
