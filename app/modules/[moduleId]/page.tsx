import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { getModuleDetail } from "@/lib/modules-data";
import { VersionHistory } from "@/components/VersionHistory";
import { CountrySwitcher } from "@/components/CountrySwitcher";
import { ChangesPanel } from "@/components/ChangesPanel";

export default async function ModuleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ moduleId: string }>;
  searchParams: Promise<{ country?: string }>;
}) {
  const user = await requireUser();
  const { moduleId } = await params;
  const { country } = await searchParams;
  const { activeCountryId, countries, t } = await resolveActiveCountry(user, country);

  if (!activeCountryId) {
    return (
      <p className="text-sm text-ink/60">
        {user.role === "admin" ? t.noCountriesYet : t.noCountryAssigned}
      </p>
    );
  }

  const { module, versions } = await getModuleDetail(moduleId, activeCountryId);

  if (!module) notFound();

  return (
    <div>
      {countries.length > 0 && (
        <div className="mb-5">
          <CountrySwitcher
            countries={countries}
            activeCountryId={activeCountryId}
            basePath={`/modules/${moduleId}`}
          />
        </div>
      )}

      <p className="badge-pill mb-3">{module.category ?? t.noCategory}</p>
      <h1 className="mb-6 font-heading text-3xl font-bold text-ink">{module.name}</h1>

      {/* Dokument zabírá zbytek šířky, panel změn má pevných 340 px.
          Pod 820 px se sloupce skládají pod sebe. */}
      <div className="grid grid-cols-1 gap-6 doc:grid-cols-[minmax(0,1fr)_340px]">
        <VersionHistory versions={versions} t={t} />
        <ChangesPanel t={t} />
      </div>
    </div>
  );
}
