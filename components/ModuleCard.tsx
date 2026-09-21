import Link from "next/link";
import { FileText } from "lucide-react";
import type { ModuleWithLatestVersion } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

export function ModuleCard({
  module,
  countryId,
  t,
}: {
  module: ModuleWithLatestVersion;
  countryId: string;
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

      <h3 className="font-heading text-lg font-bold text-ink">{module.name}</h3>

      {latest ? (
        <div className="mt-auto text-sm text-ink/60">
          <p>
            {t.currentVersion}: v{latest.version_number}
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
