import type { Dictionary } from "@/lib/i18n";

/** Metodika tak, jak stačí k vypsání jejího názvu. */
export type NamedModule = { name: string; name_en?: string | null };

// Název metodiky pro zobrazení.
//
// V anglickém rozhraní se použije přesný anglický název z webu, pokud ho
// metodika má. Když ho nemá, ukáže se původní český název — nikdy se
// nepřekládá automaticky a appka si vlastní znění nevymýšlí.
export function moduleName(module: NamedModule, t: Dictionary): string {
  if (t.locale !== "en") return module.name;

  const anglicky = module.name_en?.trim();
  return anglicky ? anglicky : module.name;
}
