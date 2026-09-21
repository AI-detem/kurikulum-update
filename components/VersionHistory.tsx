import type { Change, DocumentVersion } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";
import { PdfPreview } from "@/components/PdfPreview";

type VersionWithChanges = DocumentVersion & { changes: Change[] };

export function VersionHistory({
  versions,
  t,
}: {
  versions: VersionWithChanges[];
  t: Dictionary;
}) {
  if (versions.length === 0) {
    return <p className="text-sm text-ink/50">{t.noVersions}</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {versions.map((version, index) => (
        <li key={version.id} className="rounded-2xl border border-haze p-5">
          <span className="font-heading text-lg font-bold text-ink">
            {t.version} {version.version_number}
          </span>

          <p className="mt-1 text-xs text-ink/40">
            {t.uploaded} {new Date(version.uploaded_at).toLocaleDateString(t.dateLocale)}
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {version.changes.map((change) => (
              <li key={change.id} className="dashed-divider pt-2 text-sm">
                {change.category && <span className="badge-pill mr-2">{change.category}</span>}
                {change.note}
              </li>
            ))}
          </ul>

          {/* Verze jsou seřazené od nejnovější, takže první z nich má
              náhled otevřený rovnou. */}
          <div className="mt-4">
            <PdfPreview fileUrl={version.file_url} defaultOpen={index === 0} t={t} />
          </div>
        </li>
      ))}
    </ol>
  );
}
