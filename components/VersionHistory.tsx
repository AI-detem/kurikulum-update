import { Download } from "lucide-react";
import type { Change, DocumentVersion } from "@/lib/types";

type VersionWithChanges = DocumentVersion & { changes: Change[] };

export function VersionHistory({ versions }: { versions: VersionWithChanges[] }) {
  if (versions.length === 0) {
    return <p className="text-sm text-ink/50">Pro tento modul zatím není nahraná žádná verze.</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {versions.map((version) => (
        <li key={version.id} className="rounded-2xl border border-haze p-5">
          <div className="flex items-center justify-between">
            <span className="font-heading text-lg font-bold text-ink">
              Verze {version.version_number}
            </span>
            <a
              href={version.file_url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-coral hover:underline"
            >
              <Download size={16} />
              Stáhnout PDF
            </a>
          </div>

          <p className="mt-1 text-xs text-ink/40">
            Nahráno {new Date(version.uploaded_at).toLocaleDateString("cs-CZ")}
          </p>

          <ul className="mt-3 flex flex-col gap-2">
            {version.changes.map((change) => (
              <li key={change.id} className="dashed-divider pt-2 text-sm">
                {change.category && <span className="badge-pill mr-2">{change.category}</span>}
                {change.note}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
