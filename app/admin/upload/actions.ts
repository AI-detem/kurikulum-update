"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser, canUpload } from "@/lib/current-user";
import { notifyCountryAboutChange } from "@/lib/notify";

export async function uploadDocumentVersion(formData: FormData) {
  const user = await requireUser();
  if (!canUpload(user)) {
    throw new Error("Nemáš oprávnění nahrávat nové verze.");
  }

  const moduleId = formData.get("moduleId") as string;
  const countryId = formData.get("countryId") as string;
  const note = formData.get("note") as string;
  const category = (formData.get("category") as string) || null;
  const file = formData.get("file") as File;

  if (!moduleId || !countryId || !note || !file || file.size === 0) {
    throw new Error("Vyplň prosím modul, zemi, soubor i poznámku ke změně.");
  }

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

  // Nahrání PDF do Supabase Storage, cesta podle země a modulu.
  const filePath = `${countryId}/${moduleId}/v${nextVersionNumber}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { contentType: "application/pdf" });

  if (uploadError) {
    throw new Error(`Nahrání souboru selhalo: ${uploadError.message}`);
  }

  // Bucket "documents" je privátní, takže si do file_url ukládáme jen cestu
  // k souboru. Skutečná (dočasná) URL pro stažení se generuje až při zobrazení
  // (viz getSignedPdfUrl v lib/modules-data.ts), aby k PDF nešlo přistoupit
  // bez přihlášení.
  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      module_id: moduleId,
      country_id: countryId,
      file_url: filePath,
      version_number: nextVersionNumber,
      uploaded_by: user.id,
    })
    .select()
    .single();

  if (versionError || !version) {
    throw new Error(`Uložení verze selhalo: ${versionError?.message}`);
  }

  const { data: change, error: changeError } = await supabase
    .from("changes")
    .insert({ document_version_id: version.id, note, category })
    .select()
    .single();

  if (changeError || !change) {
    throw new Error(`Uložení poznámky ke změně selhalo: ${changeError?.message}`);
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
  redirect(`/modules/${moduleId}`);
}
