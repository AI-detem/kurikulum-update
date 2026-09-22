import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { getPendingChanges } from "@/lib/country-status";
import { createClient } from "@/lib/supabase/server";
import { ChangesFromOthers } from "@/components/ChangesFromOthers";
import { CountrySwitcher } from "@/components/CountrySwitcher";

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; module?: string }>;
}) {
  const user = await requireUser();
  const { country, module: moduleId } = await searchParams;
  const { activeCountryId, countries, t } = await resolveActiveCountry(user, country);

  if (!activeCountryId) {
    return (
      <p className="text-sm text-ink/60">
        {user.role === "admin" ? t.noCountriesYet : t.noCountryAssigned}
      </p>
    );
  }

  const items = await getPendingChanges(activeCountryId, moduleId);

  // Název metodiky do popisku filtru.
  let moduleName = "";
  if (moduleId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("modules")
      .select("name")
      .eq("id", moduleId)
      .maybeSingle();
    moduleName = data?.name ?? "";
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-ink">{t.changesFromOthers}</h1>
        <CountrySwitcher
          countries={countries}
          activeCountryId={activeCountryId}
          basePath="/changes"
        />
      </div>

      {moduleId && (
        <p className="mb-4 flex items-center gap-2 text-sm text-ink/60">
          <span className="badge-pill">{moduleName}</span>
          <Link
            href={`/changes?country=${activeCountryId}`}
            className="text-coral hover:underline"
          >
            {t.allModules}
          </Link>
        </p>
      )}

      <ChangesFromOthers items={items} t={t} />
    </div>
  );
}
