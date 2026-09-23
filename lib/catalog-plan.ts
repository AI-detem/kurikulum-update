// Porovnání katalogu z webu s tím, co je v databázi. Čistý výpočet bez
// zápisu – stejný plán se použije pro náhled i pro samotný import.
import { normalize, type CatalogItem } from "@/lib/catalog";

export type ModuleRow = {
  id: string;
  name: string;
  slug: string | null;
  category: string | null;
  archived_at: string | null;
};

export type ImportPlan = {
  /** Metodiky, které v databázi zatím nejsou. */
  toAdd: { slug: string; name: string; section: string | null }[];
  /** Existující metodiky, kterým se na webu změnil název. */
  toRename: { id: string; slug: string; from: string; to: string }[];
  /** Ručně přidané metodiky, které se podle názvu spárují s webem. */
  toLink: { id: string; name: string; slug: string }[];
  /** Metodiky, které z webu zmizely. Nemažou se, jen se archivují. */
  toArchive: { id: string; name: string }[];
  unchanged: number;
  total: number;
  warnings: string[];
};

export function buildPlan(
  items: CatalogItem[],
  modules: ModuleRow[],
  warnings: string[]
): ImportPlan {
  const podleSlugu = new Map(modules.flatMap((m) => (m.slug ? [[m.slug, m] as const] : [])));
  // Ručně přidané metodiky (bez slugu) se párují podle názvu, ať z nich
  // import neudělá duplikát.
  const podleNazvu = new Map(
    modules.filter((m) => !m.slug).map((m) => [normalize(m.name), m] as const)
  );

  const toAdd: ImportPlan["toAdd"] = [];
  const toRename: ImportPlan["toRename"] = [];
  const toLink: ImportPlan["toLink"] = [];
  const sparovane = new Set<string>();
  let unchanged = 0;

  for (const item of items) {
    const podleSlug = podleSlugu.get(item.slug);
    if (podleSlug) {
      sparovane.add(podleSlug.id);
      if (podleSlug.name === item.name) unchanged += 1;
      else
        toRename.push({
          id: podleSlug.id,
          slug: item.slug,
          from: podleSlug.name,
          to: item.name,
        });
      continue;
    }

    const rucni = podleNazvu.get(normalize(item.name));
    if (rucni && !sparovane.has(rucni.id)) {
      sparovane.add(rucni.id);
      toLink.push({ id: rucni.id, name: rucni.name, slug: item.slug });
      continue;
    }

    toAdd.push({ slug: item.slug, name: item.name, section: item.section });
  }

  // Archivuje se jen to, co z webu opravdu zmizelo. Ručně přidané metodiky
  // (bez slugu) se nikdy nearchivují – ty na webu nikdy nebyly.
  const toArchive = modules
    .filter((m) => m.slug && !m.archived_at && !sparovane.has(m.id))
    .map((m) => ({ id: m.id, name: m.name }));

  return { toAdd, toRename, toLink, toArchive, unchanged, total: items.length, warnings };
}
