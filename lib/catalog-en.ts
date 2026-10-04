// Přesné anglické názvy metodik z webu.
//
// Appka anglický název nikdy nepřekládá ani si ho nevymýšlí. Buď ho na
// webu najde a uloží tak, jak tam stojí, nebo zůstane prázdný a rozhraní
// ukáže původní český název.
import { parse } from "node-html-parser";

// Anglická verze katalogu stojí na jedné z těchhle adres. Zkouší se
// popořadě, první funkční vyhraje.
export const EN_CATALOG_URLS = [
  "https://kurikulum.aidetem.cz/en/vypis-vseho/",
  "https://kurikulum.aidetem.cz/metodikyeng/",
  "https://kurikulum.aidetem.cz/en/",
];

export type EnglishFetch = {
  /** Klíčem je slug české metodiky, hodnotou přesný anglický název. */
  names: Map<string, string>;
  /** Adresa, ze které se to povedlo načíst. */
  source: string | null;
  warnings: string[];
};

export async function fetchEnglishNames(
  urls: string[] = EN_CATALOG_URLS
): Promise<EnglishFetch> {
  const warnings: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: { "user-agent": "AI-kurikulum-import" },
        cache: "no-store",
      });
      if (!response.ok) continue;

      const names = parseEnglishNames(await response.text());
      if (names.size > 0) return { names, source: url, warnings };
    } catch {
      // Nedostupná adresa není chyba importu – anglické názvy jsou
      // doplněk, český katalog se naimportuje i bez nich.
    }
  }

  warnings.push(
    `Anglické názvy se nepodařilo načíst (zkoušeno: ${urls.join(", ")}). Metodiky zůstanou s českým názvem.`
  );
  return { names: new Map(), source: null, warnings };
}

// Stejný tvar stránky jako český výpis: odkazy do /knowledgebase/<slug>/.
// Slug drží dvojici pohromadě – anglická stránka odkazuje na tutéž
// metodiku, takže se názvy spárují bez hádání podle textu.
export function parseEnglishNames(html: string): Map<string, string> {
  const root = parse(html);
  const names = new Map<string, string>();

  for (const odkaz of root.querySelectorAll("a")) {
    const slug = slugFromHref(odkaz.getAttribute("href"));
    if (!slug) continue;

    const name = odkaz.text.replace(/\s+/g, " ").trim();
    if (!name) continue;
    // Tentýž odkaz bývá na stránce víckrát (obrázek + titulek), bereme první.
    if (!names.has(slug)) names.set(slug, name);
  }

  return names;
}

function slugFromHref(href: string | undefined): string | null {
  if (!href) return null;

  const match = href.match(/\/knowledgebase\/([^/?#]+)/);
  if (!match) return null;

  const slug = decodeURIComponent(match[1]).trim();
  return slug.length > 0 ? slug : null;
}
