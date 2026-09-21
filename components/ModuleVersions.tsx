"use client";

import { useState, useTransition } from "react";
import { FileText, Download } from "lucide-react";
import { AnnotationWorkspace } from "@/components/annotations/AnnotationWorkspace";
import { saveAnnotations } from "@/app/modules/[moduleId]/actions";
import { driveViewUrl, extractDriveFileId } from "@/lib/drive";
import type { Change, DocumentVersion, Mark } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

type VersionWithChanges = DocumentVersion & { changes: Change[] };

// Seznam verzí a nad ním dokument té vybrané, se značkami a jejich popisy.
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
  const [saved, setSaved] = useState(false);
  const [isSaving, startSaving] = useTransition();

  if (versions.length === 0) {
    return <p className="text-sm text-ink/50">{t.noVersions}</p>;
  }

  const openVersion = versions.find((version) => version.id === openId) ?? null;
  const fileId = openVersion ? extractDriveFileId(openVersion.file_url) : null;
  const openMarks = openId ? marks[openId] ?? [] : [];

  function updateMarks(update: (current: Mark[]) => Mark[]) {
    if (!openId) return;
    setSaved(false);
    setMarks((current) => ({ ...current, [openId]: update(current[openId] ?? []) }));
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
        <ol className="mb-4 flex flex-col gap-3">
          {versions.map((version) => (
            <li key={version.id} className="rounded-2xl border border-haze p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="font-heading text-lg font-bold text-ink">
                    {t.version} {version.version_number}
                  </span>
                  <p className="text-xs text-ink/40">
                    {t.uploaded}{" "}
                    {new Date(version.uploaded_at).toLocaleDateString(t.dateLocale)}
                  </p>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenId((current) => (current === version.id ? null : version.id))
                    }
                    className="flex items-center gap-1.5 text-sm font-medium text-coral hover:underline"
                  >
                    <FileText size={16} />
                    {openId === version.id ? t.hidePdf : t.viewPdf}
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
            </li>
          ))}
        </ol>
      }
      panelFooter={
        editable && openId ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() =>
                startSaving(async () => {
                  await saveAnnotations(openId, moduleId, openMarks);
                  setSaved(true);
                })
              }
              className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? t.saving : t.save}
            </button>
            {saved && <p className="text-xs text-ink/50">{t.saved}</p>}
          </div>
        ) : null
      }
    />
  );
}
