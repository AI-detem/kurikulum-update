// Srovnání zemí přiřazených uživateli.
//
// Dřív se při uložení všechno smazalo a vložilo znovu, což padalo na
// unikátním klíči, jakmile uživatel zemi už měl. Nově se dopíše jen to,
// co chybí, a smaže jen to, co ubylo – uložení beze změny nezapisuje nic.

// Jen ta část klienta Supabase, kterou tahle funkce potřebuje. Díky tomu
// jde funkce otestovat bez databáze.
export type UserCountriesClient = {
  from: (table: "user_countries") => {
    select: (columns: string) => {
      eq: (
        column: string,
        value: string
      ) => PromiseLike<{ data: { country_id: string }[] | null; error: { message: string } | null }>;
    };
    upsert: (
      rows: { user_id: string; country_id: string }[],
      options: { onConflict: string; ignoreDuplicates: boolean }
    ) => PromiseLike<{ error: { message: string } | null }>;
    delete: () => {
      eq: (
        column: string,
        value: string
      ) => {
        in: (
          column: string,
          values: string[]
        ) => PromiseLike<{ error: { message: string } | null }>;
      };
    };
  };
};

export async function setUserCountries(
  supabase: UserCountriesClient,
  userId: string,
  countryIds: string[]
): Promise<string | null> {
  const { data: soucasne, error: readError } = await supabase
    .from("user_countries")
    .select("country_id")
    .eq("user_id", userId);

  if (readError) return `Načtení zemí selhalo: ${readError.message}`;

  const uz = new Set((soucasne ?? []).map((row) => row.country_id));
  const chybejici = countryIds.filter((id) => !uz.has(id));
  const odebrane = [...uz].filter((id) => !countryIds.includes(id));

  if (chybejici.length > 0) {
    // ignoreDuplicates kvůli souběhu: kdyby někdo uložil formulář dvakrát
    // rychle za sebou, druhý zápis se jen tiše přeskočí.
    const { error } = await supabase
      .from("user_countries")
      .upsert(
        chybejici.map((countryId) => ({ user_id: userId, country_id: countryId })),
        { onConflict: "user_id,country_id", ignoreDuplicates: true }
      );

    if (error) return `Přiřazení země selhalo: ${error.message}`;
  }

  if (odebrane.length > 0) {
    const { error } = await supabase
      .from("user_countries")
      .delete()
      .eq("user_id", userId)
      .in("country_id", odebrane);

    if (error) return `Odebrání země selhalo: ${error.message}`;
  }

  return null;
}
