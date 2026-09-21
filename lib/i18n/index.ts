import { cs, type Dictionary } from "./cs";
import { sk } from "./sk";
import { en } from "./en";
import { hu } from "./hu";

export type { Dictionary };

export const LOCALES = ["cs", "sk", "en", "hu"] as const;
export type Locale = (typeof LOCALES)[number];

const dictionaries: Record<Locale, Dictionary> = { cs, sk, en, hu };

// Hodnota ze sloupce countries.locale může být cokoli, co admin vyplní,
// takže ji tady ověříme. Nerozpoznaný jazyk spadne na češtinu.
export function toLocale(value: string | null | undefined): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : "cs";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
