import { requireUser } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { getModulesForCountry } from "@/lib/modules-data";
import { ModuleCard } from "@/components/ModuleCard";
import { CountrySwitcher } from "@/components/CountrySwitcher";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const user = await requireUser();
  const { country } = await searchParams;
  const { activeCountryId, countries } = await resolveActiveCountry(user, country);

  if (!activeCountryId) {
    return (
      <p className="text-sm text-ink/60">
        {user.role === "admin"
          ? "Zatím není založená žádná země. Přidej ji v Administraci."
          : "Zatím ti není přiřazená žádná země. Ozvi se administrátorovi appky."}
      </p>
    );
  }

  const modules = await getModulesForCountry(activeCountryId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-ink">Metodiky</h1>
        <CountrySwitcher
          countries={countries}
          activeCountryId={activeCountryId}
          basePath="/"
        />
      </div>

      {modules.length === 0 ? (
        <p className="text-sm text-ink/50">Zatím tu nejsou žádné moduly.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} countryId={activeCountryId} />
          ))}
        </div>
      )}
    </div>
  );
}
