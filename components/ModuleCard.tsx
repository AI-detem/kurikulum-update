import Link from "next/link";
import { FileText } from "lucide-react";
import type { CountryLight, ModuleWithLatestVersion } from "@/lib/types";
import { StatusDot } from "@/components/StatusDot";
import type { Dictionary } from "@/lib/i18n";
import { LocalDateTime } from "@/components/LocalDateTime";

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

  return (
    <Link
      href={`/modules/${module.id}?country=${countryId}`}
      className="flex flex-col gap-3 rounded-2xl border border-haze bg-white p-5 transition hover:border-coral"
    >
      <div className="flex items-center justify-between">
        {module.category && <span className="badge-pill">{module.category}</span>}
        <FileText size={18} className="text-ink/40" />
      </div>

      <div className="flex items-start gap-2">
        <StatusDot light={light} label={lightTitle} size={10} />
        <h3 className="font-heading text-lg font-bold leading-tight text-ink">
          {module.name}
        </h3>
      </div>

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

      <p className="dashed-divider pt-2 text-xs text-ink/40">
        {t.totalVersions}: {module.version_count}
      </p>
    </Link>
  );
}
