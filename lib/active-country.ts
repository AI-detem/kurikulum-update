// Která země se má uživateli právě zobrazit a v jakém jazyce.
//
// Admin nemá povinně přiřazenou zemi (spravuje všechny), takže si může mezi
// zeměmi přepínat přes parametr ?country=... v adrese. Zůstává přitom
// přihlášený sám za sebe, jen si prohlíží obsah a rozhraní dané země.
// Viewer a editor vidí vždy jen svou vlastní zemi – parametr z adresy se u nich
// záměrně ignoruje, aby si nešlo zobrazit cizí zemi ručním přepsáním adresy.
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getDictionary, toLocale, type Dictionary } from "@/lib/i18n";
import { VIEW_COUNTRY_COOKIE } from "@/lib/view-country";
import type { AppUser, Country } from "@/lib/types";

export type ActiveCountry = {
  activeCountryId: string | null;
  /** Seznam zemí pro přepínač – naplněný jen adminům. */
  countries: Country[];
  /** Texty rozhraní v jazyce prohlížené země. */
  t: Dictionary;
};

export async function resolveActiveCountry(
  user: AppUser,
  requestedCountryId?: string
): Promise<ActiveCountry> {
  const supabase = await createClient();

  if (user.role !== "admin") {
    if (!user.country_id) {
      return { activeCountryId: null, countries: [], t: getDictionary("cs") };
    }

    const { data: country } = await supabase
      .from("countries")
      .select("*")
      .eq("id", user.country_id)
      .single();

    return {
      activeCountryId: user.country_id,
      countries: [],
      t: getDictionary(toLocale(country?.locale)),
    };
  }

  const { data } = await supabase.from("countries").select("*").order("name");
  const countries = data ?? [];

  // Layout parametry z adresy nedostává, proto se zemí drží i v cookie.
  const countryFromCookie = (await cookies()).get(VIEW_COUNTRY_COOKIE)?.value;

  // Pořadí: země z adresy, pak z cookie, pak vlastní země admina,
  // nakonec první země v seznamu.
  const active =
    countries.find((country) => country.id === requestedCountryId) ??
    countries.find((country) => country.id === countryFromCookie) ??
    countries.find((country) => country.id === user.country_id) ??
    countries[0] ??
    null;

  return {
    activeCountryId: active?.id ?? null,
    countries,
    t: getDictionary(toLocale(active?.locale)),
  };
}
