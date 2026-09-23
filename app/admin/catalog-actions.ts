"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/current-user";
import { CATALOG_URL, fetchCatalog, type CatalogItem } from "@/lib/catalog";
import { buildPlan, type ImportPlan, type ModuleRow } from "@/lib/catalog-plan";

export type PlanResult = { plan: ImportPlan } | { error: string };
export type ApplyResult =
  | { added: number; renamed: number; linked: number; archived: number }
  | { error: string };

// Co import udělá, ještě než něco zapíše.
export async function previewCatalogImport(): Promise<PlanResult> {
  await requireAdmin();

  try {
    const [katalog, modules] = await Promise.all([fetchCatalog(), loadModules()]);
    return { plan: buildPlan(katalog.items, modules, katalog.warnings) };
  } catch (chyba) {
    return { error: popisChyby(chyba) };
  }
}

// Zápis. Katalog se načte znovu, aby se zapsalo to, co je na webu teď,
// a ne to, co viděl náhled před minutou.
export async function applyCatalogImport(): Promise<ApplyResult> {
  await requireAdmin();

  let items: CatalogItem[];
  let plan: ImportPlan;
  try {
    const [katalog, modules] = await Promise.all([fetchCatalog(), loadModules()]);
    items = katalog.items;
    plan = buildPlan(items, modules, katalog.warnings);
  } catch (chyba) {
    return { error: popisChyby(chyba) };
  }

  const supabase = await createClient();
  const podleSlugu = new Map(items.map((item) => [item.slug, item]));

  if (plan.toAdd.length > 0) {
    const rows = plan.toAdd.flatMap((add) => {
      const item = podleSlugu.get(add.slug);
      return item ? [radekZPolozky(item)] : [];
    });

    const { error } = await supabase.from("modules").insert(rows);
    if (error) return { error: error.message };
  }

  // Přejmenování a spárování. Při té příležitosti se u nich srovná i sekce,
  // odkaz a pořadí podle webu.
  const kUprave = new Map<string, string>();
  for (const r of plan.toRename) kUprave.set(r.slug, r.id);
  for (const l of plan.toLink) kUprave.set(l.slug, l.id);

  for (const [slug, id] of kUprave) {
    const item = podleSlugu.get(slug);
    if (!item) continue;

    const { error } = await supabase
      .from("modules")
      .update({ ...radekZPolozky(item), archived_at: null })
      .eq("id", id);
    if (error) return { error: error.message };
  }

  if (plan.toArchive.length > 0) {
    const { error } = await supabase
      .from("modules")
      .update({ archived_at: new Date().toISOString() })
      .in(
        "id",
        plan.toArchive.map((m) => m.id)
      );
    if (error) return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/");
  revalidatePath("/admin/upload");

  return {
    added: plan.toAdd.length,
    renamed: plan.toRename.length,
    linked: plan.toLink.length,
    archived: plan.toArchive.length,
  };
}

function radekZPolozky(item: CatalogItem) {
  return {
    name: item.name,
    slug: item.slug,
    category: item.section,
    source_url: item.url,
    order_index: item.orderIndex,
  };
}

async function loadModules(): Promise<ModuleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("modules")
    .select("id, name, slug, category, archived_at");

  if (error) throw new Error(error.message);
  return (data ?? []) as ModuleRow[];
}

function popisChyby(chyba: unknown): string {
  const zprava = chyba instanceof Error ? chyba.message : String(chyba);
  return `Katalog se nepodařilo načíst z ${CATALOG_URL}: ${zprava}`;
}
