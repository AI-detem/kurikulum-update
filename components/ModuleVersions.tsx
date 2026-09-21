"use client";

import { useState, useTransition } from "react";
import { FileText, Download } from "lucide-react";
import { AnnotationWorkspace } from "@/components/annotations/AnnotationWorkspace";
import { saveAnnotations } from "@/app/modules/[moduleId]/actions";
import { driveViewUrl, extractDriveFileId } from "@/lib/drive";
import { formatDateTime } from "@/lib/format";
import type { Change, DocumentVersion, Mark } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

type VersionWithChanges = DocumentVersion & { changes: Change[] };

// Nejnovější verze a pod ní její dokument se značkami. Starší verze jsou
// sbalené, aby dokument začínal hned pod hlavičkou.
export function ModuleVersions({
  moduleId,
  versions,
  marksByVersion,
  editable,
  t,
}: {
  moduleId: string;
  versions: VersionWithChanges[];
  marksByVersion: Record<string, Mark[]>;
  editable: boolean;
  t: Dictionary;
}) {
  // Rozbalená je vždy nejvýš jedna verze, aby se nevykreslovalo deset
  // dokumentů najednou.
  const [openId, setOpenId] = useState<string | null>(versions[0]?.id ?? null);
  const [marks, setMarks] = useState<Record<string, Mark[]>>(marksByVersion);
  const [saveResult, setSaveResult] = useState<{ error?: string; ok?: boolean } | null>(null);
  const [isSaving, startSaving] = useTransition();

  if (versions.length === 0) {
    return <p className="text-sm text-ink/50">{t.noVersions}</p>;
  }

  const [current, ...older] = versions;
  const openVersion = versions.find((version) => version.id === openId) ?? null;
  const fileId = openVersion ? extractDriveFileId(openVersion.file_url) : null;
  const openMarks = openId ? marks[openId] ?? [] : [];

  function updateMarks(update: (currentMarks: Mark[]) => Mark[]) {
    if (!openId) return;
    setSaveResult(null);
    setMarks((all) => ({ ...all, [openId]: update(all[openId] ?? []) }));
  }

  function toggle(versionId: string) {
    setOpenId((value) => (value === versionId ? null : versionId));
  }

  return (
    <AnnotationWorkspace
      fileId={fileId}
      driveUrl={openVersion ? driveViewUrl(openVersion.file_url) : ""}
      marks={openMarks}
      setMarks={updateMarks}
      editable={editable}
      t={t}
      documentHeader={
        <div className="mb-4 flex flex-col gap-3">
          <VersionRow
            version={current}
            open={openId === current.id}
            onToggle={() => toggle(current.id)}
            t={t}
          />

          {older.length > 0 && (
            <details className="rounded-2xl border border-haze px-4 py-3">
              <summary className="cursor-pointer text-sm font-medium text-ink/70">
                {t.olderVersions} ({older.length})
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {older.map((version) => (
                  <VersionRow
                    key={version.id}
                    version={version}
                    open={openId === version.id}
                    onToggle={() => toggle(version.id)}
                    t={t}
                  />
                ))}
              </div>
            </details>
          )}
        </div>
      }
      panelFooter={
        editable && openId ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                startSaving(async () => {
                  const result = await saveAnnotations(openId, moduleId, openMarks);
                  setSaveResult(result ? { error: result.error } : { ok: true });
                })
              }
              className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? t.saving : t.saveChanges}
            </button>
            {saveResult?.ok && <p className="text-xs text-ink/50">{t.saved}</p>}
            {saveResult?.error && <p className="text-sm text-coral">{saveResult.error}</p>}
          </div>
        ) : null
      }
    />
  );
}

function VersionRow({
  version,
  open,
  onToggle,
  t,
}: {
  version: VersionWithChanges;
  open: boolean;
  onToggle: () => void;
  t: Dictionary;
}) {
  return (
    <div className="rounded-2xl border border-haze p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="font-heading text-lg font-bold text-ink">
            {t.version} {version.version_number}
          </span>
          <p className="text-xs text-ink/40">
            {t.uploaded} {formatDateTime(version.uploaded_at, t.dateLocale)}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onToggle}
            className="flex items-center gap-1.5 text-sm font-medium text-coral hover:underline"
          >
            <FileText size={16} />
            {open ? t.hidePdf : t.viewPdf}
          </button>

          <a
            href={driveViewUrl(version.file_url)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:underline"
          >
            <Download size={16} />
            {t.downloadPdf}
          </a>
        </div>
      </div>

      {version.changes.map((change) => (
        <p key={change.id} className="dashed-divider mt-3 whitespace-pre-line pt-2 text-sm">
          {change.note}
        </p>
      ))}
    </div>
  );
}
