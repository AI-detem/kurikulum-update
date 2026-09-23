import { requireUser } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { getModulesForCountry } from "@/lib/modules-data";
import { getChanges, getLightsForCountry, lightLabel } from "@/lib/country-status";
import { ChangesFromOthers } from "@/components/ChangesFromOthers";
import { ModuleCard } from "@/components/ModuleCard";
import { CountrySwitcher } from "@/components/CountrySwitcher";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; module?: string }>;
}) {
  const user = await requireUser();
  const { country, module: focusModuleId } = await searchParams;
  const { activeCountryId, countries, t, locale } = await resolveActiveCountry(user, country);

  if (!activeCountryId) {
    return (
      <p className="text-sm text-ink/60">
        {user.role === "admin" ? t.noCountriesYet : t.noCountryAssigned}
      </p>
    );
  }

  const [modules, lights, pending, dismissed] = await Promise.all([
    getModulesForCountry(activeCountryId),
    getLightsForCountry(activeCountryId),
    getChanges(activeCountryId, "pending"),
    getChanges(activeCountryId, "dismissed"),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="font-heading text-3xl font-bold text-ink">{t.methodologies}</h1>
        <CountrySwitcher
          countries={countries}
          activeCountryId={activeCountryId}
          basePath="/"
        />
      </div>

      {/* Změny od ostatních zemí. Když není co řešit ani co skrytého,
          blok se nevykreslí vůbec. */}
      <ChangesFromOthers
        pending={pending}
        dismissed={dismissed}
        focusModuleId={focusModuleId}
        locale={locale}
        t={t}
      />

      {/* Appka bude většinu času prázdná a to je v pořádku – ať to
          nevypadá jako nedodělek. */}
      {pending.length === 0 && (
        <div className="mb-8 rounded-2xl bg-haze/40 px-5 py-4">
          <p className="text-sm font-medium text-ink">{t.noUpdatesTitle}</p>
          <p className="mt-0.5 text-sm text-ink/60">{t.noUpdatesHint}</p>
        </div>
      )}

      {modules.length === 0 ? (
        <p className="text-sm text-ink/50">{t.noModules}</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const light = lights[module.id] ?? "green";
            return (
              <ModuleCard
                key={module.id}
                module={module}
                countryId={activeCountryId}
                light={light}
                lightTitle={lightLabel(light, t)}
                t={t}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
