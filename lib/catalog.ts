// Načtení katalogu metodik z webu kurikulum.aidetem.cz, který je zdrojem pravdy.
//
// Stránka je běžný WordPress výpis: nadpisy sekcí a pod nimi odkazy do
// /knowledgebase/<slug>/. Nespoléháme se na názvy tříd v HTML (ty se při
// úpravě šablony mění), ale na nadpisy sekcí a tvar adres.
import { parse, type HTMLElement } from "node-html-parser";

export const CATALOG_URL = "https://kurikulum.aidetem.cz/vypis-vseho/";

// Sekce, ve kterých je katalog rozdělený. Slouží jako kotvy při čtení
// stránky – co je pod nadpisem sekce, patří do ní.
export const SECTIONS = [
  "AI v informatice na 1. stupni",
  "AI v informatice na 2. stupni a SŠ",
  "Projektové metodiky a pracovní listy",
  "Mediální výchova",
  "Wellbeing",
  "Humanitní předměty",
  "Přírodovědné předměty a matematika",
  "Karty pro rozvoj digitální kompetence",
] as const;

export type CatalogItem = {
  slug: string;
  name: string;
  /** Název sekce, pod kterou metodika na webu stojí. */
  section: string | null;
  url: string;
  orderIndex: number;
};

export type CatalogFetch = {
  items: CatalogItem[];
  /** Na co si dát pozor – nečekaný tvar stránky, chybějící sekce apod. */
  warnings: string[];
};

// Porovnávací tvar textu: bez diakritiky, malými písmeny, bez přebytečných mezer.
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SECTION_LOOKUP = new Map(SECTIONS.map((name) => [normalize(name), name]));

export async function fetchCatalog(url: string = CATALOG_URL): Promise<CatalogFetch> {
  const response = await fetch(url, {
    headers: { "user-agent": "AI-kurikulum-import" },
    // Katalog se mění zřídka, ale import má vždy vidět aktuální stav.
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Stránku ${url} se nepodařilo načíst (HTTP ${response.status}).`);
  }

  return parseCatalog(await response.text(), url);
}

export function parseCatalog(html: string, baseUrl: string = CATALOG_URL): CatalogFetch {
  const root = parse(html);
  const warnings: string[] = [];

  const items: CatalogItem[] = [];
  const videne = new Set<string>();
  const nalezeneSekce = new Set<string>();
  let sekce: string | null = null;

  // Procházíme dokument v pořadí, v jakém je napsaný: nadpis přepne sekci,
  // odkaz do /knowledgebase/ se přiřadí té právě platné.
  for (const prvek of root.querySelectorAll("h1, h2, h3, h4, h5, a")) {
    if (prvek.tagName !== "A") {
      const nazev = SECTION_LOOKUP.get(normalize(prvek.text));
      if (nazev) {
        sekce = nazev;
        nalezeneSekce.add(nazev);
      }
      continue;
    }

    const slug = slugFromHref(prvek.getAttribute("href"));
    if (!slug) continue;

    const name = cleanText(prvek);
    if (!name) continue;
    // Tentýž odkaz bývá na stránce víckrát (obrázek + titulek), bereme první.
    if (videne.has(slug)) continue;

    videne.add(slug);
    items.push({
      slug,
      name,
      section: sekce,
      url: new URL(`/knowledgebase/${slug}/`, baseUrl).toString(),
      orderIndex: items.length,
    });
  }

  if (items.length === 0) {
    warnings.push(
      "Na stránce se nenašly žádné odkazy na metodiky. Zkontroluj prosím adresu."
    );
  }

  const chybejici = SECTIONS.filter((name) => !nalezeneSekce.has(name));
  if (chybejici.length > 0) {
    warnings.push(`Na stránce nejsou tyhle sekce: ${chybejici.join(", ")}.`);
  }

  const bezSekce = items.filter((item) => item.section === null).length;
  if (bezSekce > 0) {
    warnings.push(`${bezSekce} metodik stojí mimo známé sekce, zůstanou bez zařazení.`);
  }

  return { items, warnings };
}

function slugFromHref(href: string | undefined): string | null {
  if (!href) return null;

  const match = href.match(/\/knowledgebase\/([^/?#]+)/);
  if (!match) return null;

  const slug = decodeURIComponent(match[1]).trim();
  return slug.length > 0 ? slug : null;
}

function cleanText(prvek: HTMLElement): string {
  return prvek.text.replace(/\s+/g, " ").trim();
}
