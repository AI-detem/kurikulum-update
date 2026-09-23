"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/current-user";
import { sendChangeNotificationEmail } from "@/lib/resend";
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
  const countryIds = formData.getAll("countryIds").map(String).filter(Boolean);
  const role = formData.get("role") as UserRole;
  if (!email || countryIds.length === 0 || !role) {
    throw new Error("Vyplň prosím e-mail, aspoň jednu zemi i roli.");
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
  // automaticky založí řádek v public.users – tady mu jen doplníme roli a země.
  const { error: updateError } = await adminClient
    .from("users")
    .update({ role })
    .eq("id", data.user.id);

  if (updateError) {
    throw new Error(`Nastavení role selhalo: ${updateError.message}`);
  }

  const { error: countryError } = await adminClient
    .from("user_countries")
    .insert(countryIds.map((countryId) => ({ user_id: data.user.id, country_id: countryId })));

  if (countryError) {
    throw new Error(`Přiřazení zemí selhalo: ${countryError.message}`);
  }

  revalidatePath("/admin");
}

// Uživatel může spravovat víc zemí, proto se přiřazení pokaždé přepíše
// podle zaškrtnutých políček.
export async function updateUserRoleAndCountries(formData: FormData) {
  await requireAdmin();

  const userId = formData.get("userId") as string;
  const countryIds = formData.getAll("countryIds").map(String).filter(Boolean);
  const role = formData.get("role") as UserRole;
  if (!userId) return;

  const locale = String(formData.get("locale") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ role, locale: locale || null })
    .eq("id", userId);
  if (error) throw new Error(`Úprava uživatele selhala: ${error.message}`);

  const { error: deleteError } = await supabase
    .from("user_countries")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw new Error(`Úprava zemí selhala: ${deleteError.message}`);

  if (countryIds.length > 0) {
    const { error: insertError } = await supabase
      .from("user_countries")
      .insert(countryIds.map((countryId) => ({ user_id: userId, country_id: countryId })));
    if (insertError) throw new Error(`Úprava zemí selhala: ${insertError.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/");
}

// Zkušební notifikace na vlastní adresu, stejnou šablonou jako naostro.
export async function sendTestEmail(): Promise<
  { ok: true } | { notConfigured: true } | { error: string }
> {
  const admin = await requireAdmin();

  try {
    const result = await sendChangeNotificationEmail({
      to: admin.email,
      moduleName: "Zkušební metodika",
      versionNumber: 1,
      uploadedAt: new Date().toISOString(),
      summary: "Tohle je zkušební e-mail z Administrace, nic se nikam nenahrálo.",
      notes: ["Ukázková poznámka ke změně", "Druhá ukázková poznámka"],
      countryName: "Zkouška",
    });

    if (result.sent) return { ok: true };
    if ("notConfigured" in result) return { notConfigured: true };
    return { error: result.error };
  } catch (chyba) {
    return { error: chyba instanceof Error ? chyba.message : String(chyba) };
  }
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
