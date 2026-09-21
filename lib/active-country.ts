// Která země se má uživateli právě zobrazit.
//
// Admin nemá povinně přiřazenou zemi (spravuje všechny), takže si může mezi
// zeměmi přepínat přes parametr ?country=... v adrese.
// Viewer a editor vidí vždy jen svou vlastní zemi – parametr z adresy se u nich
// záměrně ignoruje, aby si nešlo zobrazit cizí zemi ručním přepsáním adresy.
import { createClient } from "@/lib/supabase/server";
import type { AppUser, Country } from "@/lib/types";

export async function resolveActiveCountry(
  user: AppUser,
  requestedCountryId?: string
): Promise<{ activeCountryId: string | null; countries: Country[] }> {
  if (user.role !== "admin") {
    return { activeCountryId: user.country_id, countries: [] };
  }

  const supabase = await createClient();
  const { data } = await supabase.from("countries").select("*").order("name");
  const countries = data ?? [];

  return {
    activeCountryId: requestedCountryId ?? user.country_id ?? countries[0]?.id ?? null,
    countries,
  };
}
