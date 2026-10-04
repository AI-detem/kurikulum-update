// Porovnání katalogu z webu s tím, co je v databázi. Čistý výpočet bez
// zápisu – stejný plán se použije pro náhled i pro samotný import.
//
// Zdrojem pravdy je web. Název, sekce, pořadí i odkaz se u existující
// metodiky vždy srovnají podle něj; appka si nic nedomýšlí ani nezkracuje.
import { onlyPunctuationDiffers, pairKey, type CatalogItem } from "@/lib/catalog";

export type ModuleRow = {
  id: string;
  name: string;
  name_en: string | null;
  slug: string | null;
  category: string | null;
  archived_at: string | null;
};

/** Změna názvu. `punctuationOnly` = liší se jen pomlčka, uvozovka, mezera. */
export type Rename = {
  id: string;
  slug: string;
  from: string;
  to: string;
  punctuationOnly: boolean;
};

export type ImportPlan = {
  /** Metodiky, které v databázi zatím nejsou. */
  toAdd: { slug: string; name: string; section: string | null }[];
  /** Metodiky, kterým se oproti webu liší název. */
  toRename: Rename[];
  /** Ručně přidané metodiky, které se spárují s webem. Může u nich
   *  zároveň dojít k přejmenování – pak je `from` ≠ `to`. */
  toLink: { id: string; slug: string; from: string; to: string; punctuationOnly: boolean }[];
  /** Metodiky, kterým se oproti webu liší sekce. */
  toRecategorize: {
    id: string;
    slug: string;
    name: string;
    from: string | null;
    to: string | null;
  }[];
  /** Doplnění přesného anglického názvu z webu. */
  toSetEnglish: { id: string; slug: string; name: string; from: string | null; to: string }[];
  /** Metodiky, které z webu zmizely. Nemažou se, jen se archivují. */
  toArchive: { id: string; name: string }[];
  /** Archivovaná metodika, která se na web vrátila. */
  toUnarchive: { id: string; slug: string; name: string }[];
  /** Ručně založené metodiky, které v katalogu webu nejsou. Import se
   *  jich nedotkne, jen je vypíše – ať je poznat, co je zbytek po testech. */
  notInCatalog: { id: string; name: string; category: string | null }[];
  /** Anglické názvy, které se nepodařilo přiřadit k žádné metodice. */
  unmatchedEnglish: string[];
  unchanged: number;
  total: number;
  warnings: string[];
};

export function buildPlan(
  items: CatalogItem[],
  modules: ModuleRow[],
  warnings: string[],
  /** Přesné anglické názvy z webu, klíčem je slug české metodiky. */
  englishNames: Map<string, string> = new Map()
): ImportPlan {
  const podleSlugu = new Map(modules.flatMap((m) => (m.slug ? [[m.slug, m] as const] : [])));
  // Ručně přidané metodiky (bez slugu) se párují podle názvu, ať z nich
  // import neudělá duplikát. Klíč srovnává i interpunkci, takže jiný typ
  // pomlčky párování nerozbije.
  const podleNazvu = new Map(
    modules.filter((m) => !m.slug).map((m) => [pairKey(m.name), m] as const)
  );

  const toAdd: ImportPlan["toAdd"] = [];
  const toRename: ImportPlan["toRename"] = [];
  const toLink: ImportPlan["toLink"] = [];
  const toRecategorize: ImportPlan["toRecategorize"] = [];
  const sparovane = new Set<string>();
  // Jaká metodika odpovídá které položce webu – podle toho se pak
  // dopisují sekce a anglické názvy.
  const parovani: [ModuleRow, CatalogItem][] = [];
  let unchanged = 0;

  for (const item of items) {
    const podleSlug = podleSlugu.get(item.slug);
    if (podleSlug) {
      sparovane.add(podleSlug.id);
      parovani.push([podleSlug, item]);

      if (podleSlug.name !== item.name) {
        toRename.push({
          id: podleSlug.id,
          slug: item.slug,
          from: podleSlug.name,
          to: item.name,
          punctuationOnly: onlyPunctuationDiffers(podleSlug.name, item.name),
        });
      }
      continue;
    }

    const rucni = podleNazvu.get(pairKey(item.name));
    if (rucni && !sparovane.has(rucni.id)) {
      sparovane.add(rucni.id);
      parovani.push([rucni, item]);
      toLink.push({
        id: rucni.id,
        slug: item.slug,
        from: rucni.name,
        to: item.name,
        punctuationOnly: onlyPunctuationDiffers(rucni.name, item.name),
      });
      continue;
    }

    toAdd.push({ slug: item.slug, name: item.name, section: item.section });
  }

  // Co se z webu vrátilo, se musí zase ukázat. Bez tohohle by metodika
  // jednou archivovaná zůstala schovaná napořád, i když na webu zase je.
  const toUnarchive: ImportPlan["toUnarchive"] = parovani
    .filter(([module]) => module.archived_at !== null)
    .map(([module, item]) => ({ id: module.id, slug: item.slug, name: item.name }));

  // Sekce a anglický název se srovnávají u všeho, co je s webem spárované –
  // tedy i u metodik, kterým sedí název a jinak by se jich import nedotkl.
  const toSetEnglish: ImportPlan["toSetEnglish"] = [];
  for (const [module, item] of parovani) {
    if ((module.category ?? null) !== (item.section ?? null)) {
      toRecategorize.push({
        id: module.id,
        slug: item.slug,
        name: item.name,
        from: module.category,
        to: item.section,
      });
    }

    const anglicky = englishNames.get(item.slug);
    if (anglicky && anglicky !== module.name_en) {
      toSetEnglish.push({
        id: module.id,
        slug: item.slug,
        name: item.name,
        from: module.name_en,
        to: anglicky,
      });
    }
  }

  // Beze změny je metodika, která se s webem shoduje ve všem, co odsud
  // spravujeme – ne jen v názvu.
  const dotcene = new Set([
    ...toRename.map((r) => r.id),
    ...toLink.map((l) => l.id),
    ...toRecategorize.map((r) => r.id),
    ...toSetEnglish.map((e) => e.id),
    ...toUnarchive.map((u) => u.id),
  ]);
  unchanged = parovani.filter(([module]) => !dotcene.has(module.id)).length;

  // Archivuje se jen to, co z webu opravdu zmizelo. Ručně přidané metodiky
  // (bez slugu) se nikdy nearchivují – ty na webu nikdy nebyly.
  const toArchive = modules
    .filter((m) => m.slug && !m.archived_at && !sparovane.has(m.id))
    .map((m) => ({ id: m.id, name: m.name }));

  // Co zůstalo ručně založené a s webem se nespárovalo. Většinou zbytky
  // po zkoušení appky.
  const notInCatalog = modules
    .filter((m) => !m.slug && !sparovane.has(m.id) && !m.archived_at)
    .map((m) => ({ id: m.id, name: m.name, category: m.category }));

  const sparovaneSlugy = new Set(parovani.map(([, item]) => item.slug));
  const unmatchedEnglish = [...englishNames.entries()]
    .filter(([slug]) => !sparovaneSlugy.has(slug))
    .map(([, name]) => name);

  return {
    toAdd,
    toRename,
    toLink,
    toRecategorize,
    toSetEnglish,
    toArchive,
    toUnarchive,
    notInCatalog,
    unmatchedEnglish,
    unchanged,
    total: items.length,
    warnings,
  };
}

/** Má plán vůbec co zapisovat? `notInCatalog` je jen informace. */
export function planIsEmpty(plan: ImportPlan): boolean {
  return (
    plan.toAdd.length === 0 &&
    plan.toRename.length === 0 &&
    plan.toLink.length === 0 &&
    plan.toRecategorize.length === 0 &&
    plan.toSetEnglish.length === 0 &&
    plan.toArchive.length === 0 &&
    plan.toUnarchive.length === 0
  );
}
