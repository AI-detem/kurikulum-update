"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnnotationWorkspace } from "@/components/annotations/AnnotationWorkspace";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { adminDeleteVersion, adminSaveVersionEdits } from "@/app/modules/[moduleId]/admin-actions";
import { driveViewUrl, extractDriveFileId } from "@/lib/drive";
import type { Mark } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Oprava cizí nahrávky adminem.
//
// Vypadá stejně jako značkování při nahrávání, ale nic neodesílá:
// nevzniká nová verze, neodcházejí e-maily a stav u ostatních zemí
// zůstává, jak byl. V appce se nikde neukazuje, že do toho admin sáhl.
export function AdminVersionEditor({
  versionId,
  fileUrl,
  initialMarks,
  initialSummary,
  t,
}: {
  versionId: string;
  fileUrl: string;
  initialMarks: Mark[];
  initialSummary: string;
  t: Dictionary;
}) {
  const router = useRouter();
  const [marks, setMarks] = useState<Mark[]>(initialMarks);
  const [summary, setSummary] = useState(initialSummary);
  const [stav, setStav] = useState<"idle" | "saving" | "saved">("idle");
  const [chyba, setChyba] = useState<string | null>(null);
  const [mazani, setMazani] = useState(false);

  const fileId = extractDriveFileId(fileUrl);

  async function ulozit() {
    setStav("saving");
    setChyba(null);

    const result = await adminSaveVersionEdits(versionId, marks, summary).catch((e: Error) => ({
      error: e.message,
    }));

    if ("error" in result) {
      setStav("idle");
      setChyba(result.error);
      return;
    }

    setStav("saved");
    router.refresh();
  }

  async function smazat() {
    setChyba(null);
    const result = await adminDeleteVersion(versionId).catch((e: Error) => ({ error: e.message }));

    if ("error" in result) {
      setMazani(false);
      setChyba(result.error);
      return;
    }

    router.refresh();
  }

  return (
    <AnnotationWorkspace
      fileId={fileId}
      driveUrl={fileId ? driveViewUrl(fileUrl) : ""}
      marks={marks}
      setMarks={setMarks}
      editable
      t={t}
      panelFooter={
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            {t.summaryOptional}
            <textarea
              rows={3}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              className="input"
            />
          </label>

          <p className="text-xs text-ink/50">{t.adminEditHint}</p>

          <button
            type="button"
            onClick={ulozit}
            disabled={stav === "saving"}
            className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {stav === "saving" ? t.saving : t.adminSaveEdit}
          </button>

          {stav === "saved" && <p className="text-sm text-ink/60">{t.saved}</p>}
          {chyba && <p className="text-sm text-coral">{chyba}</p>}

          <div className="dashed-divider pt-3">
            <button
              type="button"
              onClick={() => setMazani(true)}
              className="text-sm text-ink/50 hover:text-coral"
            >
              {t.adminDeleteVersion}
            </button>

            <ConfirmDialog
              open={mazani}
              title={t.confirmDeleteVersionTitle}
              explanation={t.confirmDeleteVersionExplain}
              confirmLabel={t.confirmDeleteYes}
              cancelLabel={t.cancel}
              closeLabel={t.close}
              onCancel={() => setMazani(false)}
              onConfirm={() => {
                setMazani(false);
                void smazat();
              }}
            />
          </div>
        </div>
      }
    />
  );
}
