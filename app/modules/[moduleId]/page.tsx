import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { getModuleDetail } from "@/lib/modules-data";
import { VersionHistory } from "@/components/VersionHistory";
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

  const { module, versions } = await getModuleDetail(moduleId, activeCountryId);

  if (!module) notFound();

  return (
    <div className="max-w-4xl">
      {countries.length > 0 && (
        <div className="mb-5">
          <CountrySwitcher
            countries={countries}
            activeCountryId={activeCountryId}
            basePath={`/modules/${moduleId}`}
          />
        </div>
      )}

      <p className="badge-pill mb-3">{module.category ?? "Bez kategorie"}</p>
      <h1 className="mb-6 font-heading text-3xl font-bold text-ink">{module.name}</h1>
      <VersionHistory versions={versions} />
    </div>
  );
}
