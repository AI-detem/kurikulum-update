import Link from "next/link";
import { FileText } from "lucide-react";
import type { CountryLight, ModuleWithLatestVersion } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { LocalDateTime } from "@/components/LocalDateTime";
import { ModuleLightDot } from "@/components/ModuleLightDot";

export function ModuleCard({
  module,
  countryId,
  light,
  lightTitle,
  t,
}: {
  module: ModuleWithLatestVersion;
  countryId: string;
  /** Semafor rozpracovanosti pro tuhle metodiku a zobrazenou zemi. */
  light: CountryLight;
  lightTitle: string;
  t: Dictionary;
}) {
  const latest = module.latest_version;

  const telo = (
    <>
      <h3 className="break-words font-heading text-lg font-bold text-ink">{module.name}</h3>

      {latest ? (
        <div className="mt-auto text-sm text-ink/60">
          <p>
            {t.currentVersion}: v{latest.version_number}
          </p>
          <p className="text-xs text-ink/40">
            {t.uploaded} <LocalDateTime value={latest.uploaded_at} locale={t.dateLocale} />
          </p>
          {latest.changes[0] && (
            <p className="mt-1 line-clamp-2 text-ink/50">{latest.changes[0].note}</p>
          )}
        </div>
      ) : (
        <p className="mt-auto text-sm text-ink/40">{t.noVersionYet}</p>
      )}

      {latest && (
        <p className="dashed-divider pt-2 text-xs text-ink/40">
          {t.totalVersions}: {module.version_count}
        </p>
      )}
    </>
  );

  // Horní řádek je mimo odkaz schválně: tečka semaforu vede jinam než
  // karta a odkaz uvnitř odkazu HTML nedovoluje.
  //
  // Bez nahrané verze není kam odkazovat – karta zůstane jen textem
  // a ikona dokumentu se nekreslí.
  return (
    <div className="flex h-full flex-col gap-3 rounded-2xl border border-haze bg-white p-5 transition hover:border-coral">
      <div className="flex items-center justify-between gap-2">
        {module.category ? (
          <span className="badge-pill break-words">{module.category}</span>
        ) : (
          <span />
        )}
        <div className="flex shrink-0 items-center gap-2">
          <ModuleLightDot
            moduleId={module.id}
            countryId={countryId}
            light={light}
            label={lightTitle}
          />
          {latest && <FileText size={18} className="text-ink/40" />}
        </div>
      </div>

      {latest ? (
        <Link
          href={`/modules/${module.id}?country=${countryId}`}
          className="flex flex-1 flex-col gap-3"
        >
          {telo}
        </Link>
      ) : (
        <div className="flex flex-1 flex-col gap-3">{telo}</div>
      )}
    </div>
  );
}
