import { notFound } from "next/navigation";
import { requireUser, canUpload } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { getModuleDetail } from "@/lib/modules-data";
import { ModuleVersions } from "@/components/ModuleVersions";
import { CountrySwitcher } from "@/components/CountrySwitcher";

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

  const { module, versions, marksByVersion } = await getModuleDetail(moduleId, activeCountryId);

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

      <ModuleVersions
        moduleId={moduleId}
        versions={versions}
        marksByVersion={marksByVersion}
        editable={canUpload(user)}
        t={t}
      />
    </div>
  );
}
