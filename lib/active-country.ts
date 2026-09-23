// Která země se má uživateli právě zobrazit a v jakém jazyce.
//
// Admin spravuje všechny země, ostatní jen ty, které mají přiřazené –
// a těch může být víc (Česko i anglická verze pod jedním účtem).
// Mezi svými zeměmi se přepíná parametrem ?country=... v adrese. Cizí zemi
// si ručním přepsáním adresy zobrazit nejde: hledá se jen mezi povolenými.
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, toLocale, type Dictionary, type Locale } from "@/lib/i18n";
import { VIEW_COUNTRY_COOKIE } from "@/lib/view-country";
import type { AppUser, Country } from "@/lib/types";

export type ActiveCountry = {
  activeCountryId: string | null;
  /** Země pro přepínač. Prázdné, když je co vybírat jen jedna. */
  countries: Country[];
  /** Texty rozhraní v jazyce prohlížené země. */
  t: Dictionary;
  /** Jazyk prohlížené země – v něm se ukazují přeložené poznámky. */
  locale: Locale;
};

export async function resolveActiveCountry(
  user: AppUser,
  requestedCountryId?: string
): Promise<ActiveCountry> {
  const supabase = await createClient();
  const { data } = await supabase.from("countries").select("*").order("name");
  const vsechny = data ?? [];

  // Admin vidí všechny země, ostatní jen ty svoje.
  const countries = user.role === "admin"
    ? vsechny
    : vsechny.filter((country) => user.country_ids.includes(country.id));

  if (countries.length === 0) {
    return { activeCountryId: null, countries: [], t: getDictionary("cs"), locale: "cs" };
  }

  // Layout parametry z adresy nedostává, proto se zemí drží i v cookie.
  const countryFromCookie = (await cookies()).get(VIEW_COUNTRY_COOKIE)?.value;

  // Pořadí: země z adresy, pak z cookie, pak první ze seznamu. Do obou
  // se kouká jen mezi země, na které uživatel má právo.
  const active =
    countries.find((country) => country.id === requestedCountryId) ??
    countries.find((country) => country.id === countryFromCookie) ??
    countries[0];

  const locale = toLocale(active.locale);

  return {
    activeCountryId: active.id,
    // Přepínač se vykreslí, jen když je z čeho vybírat.
    countries: countries.length > 1 ? countries : [],
    t: getDictionary(locale),
    locale,
  };
}
