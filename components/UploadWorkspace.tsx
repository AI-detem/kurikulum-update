"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  discardDraft,
  ensureDraftVersion,
  publishVersion,
  saveDraftMarks,
  type PublishState,
} from "@/app/admin/upload/actions";
import { AnnotationWorkspace } from "@/components/annotations/AnnotationWorkspace";
import { driveViewUrl, extractDriveFileId } from "@/lib/drive";
import { fill, formatDateTime } from "@/lib/format";
import type { Country, Mark, Module } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

export type LatestVersion = {
  module_id: string;
  country_id: string;
  version_number: number;
  uploaded_at: string;
  uploaded_by_email: string | null;
};

// Rozpracovaná verze, kterou uživatel nechal rozdělanou při minulé návštěvě.
export type ExistingDraft = {
  id: string;
  module_id: string;
  country_id: string;
  file_url: string;
  saved_at: string;
  marks: Mark[];
};

// Jak dlouho po posledním úhozu se začne načítat náhled.
const LINK_DEBOUNCE_MS = 500;
// Jak dlouho po poslední změně značek se ukládá na server.
const MARKS_DEBOUNCE_MS = 800;

export function UploadWorkspace({
  modules,
  countries,
  defaultCountryId,
  canChooseCountry,
  latestVersions,
  existingDraft,
  t,
}: {
  modules: Module[];
  countries: Country[];
  defaultCountryId: string | null;
  canChooseCountry: boolean;
  latestVersions: LatestVersion[];
  existingDraft: ExistingDraft | null;
  t: Dictionary;
}) {
  // Dokud se uživatel nerozhodne, co s rozdělanou prací, nic nezobrazujeme.
  const [draftChoice, setDraftChoice] = useState<"ask" | "continue" | "fresh">(
    existingDraft ? "ask" : "fresh"
  );
  const resumed = draftChoice === "continue" && existingDraft;

  const [moduleId, setModuleId] = useState(
    resumed ? existingDraft.module_id : modules[0]?.id ?? ""
  );
  const [countryId, setCountryId] = useState(
    resumed ? existingDraft.country_id : defaultCountryId ?? ""
  );
  const [driveLink, setDriveLink] = useState(resumed ? existingDraft.file_url : "");
  const [linkForPreview, setLinkForPreview] = useState(resumed ? existingDraft.file_url : "");
  const [marks, setMarks] = useState<Mark[]>(resumed ? existingDraft.marks : []);
  const [summary, setSummary] = useState("");
  const [draftId, setDraftId] = useState<string | null>(resumed ? existingDraft.id : null);
  const [saveState, setSaveState] = useState<{ saving: boolean; savedAt: string | null; error?: string }>(
    { saving: false, savedAt: resumed ? existingDraft.saved_at : null }
  );

  const [state, formAction, isPending] = useActionState<PublishState, FormData>(
    publishVersion,
    null
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setLinkForPreview(driveLink), LINK_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [driveLink]);

  const fileId = extractDriveFileId(linkForPreview);

  // Jakmile je vyplněný modul, země a platný odkaz, založí se na pozadí
  // rozpracovaná verze, ke které se pak průběžně ukládají značky.
  useEffect(() => {
    if (!fileId || !moduleId || !countryId || draftChoice === "ask") return;
    let cancelled = false;

    (async () => {
      const result = await ensureDraftVersion(moduleId, countryId, linkForPreview);
      if (cancelled) return;
      if ("error" in result) setSaveState((s) => ({ ...s, error: result.error }));
      else setDraftId(result.draftId);
    })();

    return () => {
      cancelled = true;
    };
  }, [fileId, moduleId, countryId, linkForPreview, draftChoice]);

  // Průběžné ukládání značek. Posun a zvětšování vyvolá spoustu změn za sebou,
  // proto se ukládá až chvíli po té poslední.
  const firstRun = useRef(true);
  useEffect(() => {
    if (!draftId) return;
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }

    setSaveState((s) => ({ ...s, saving: true, error: undefined }));
    const timer = window.setTimeout(async () => {
      const result = await saveDraftMarks(draftId, marks);
      setSaveState(
        "error" in result
          ? { saving: false, savedAt: null, error: result.error }
          : { saving: false, savedAt: result.savedAt }
      );
    }, MARKS_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [marks, draftId]);

  const latest = latestVersions.find(
    (version) => version.module_id === moduleId && version.country_id === countryId
  );
  const countryName = countries.find((country) => country.id === countryId)?.name ?? "";
  const canPublish = Boolean(draftId) && (marks.length > 0 || summary.trim().length > 0);

  if (draftChoice === "ask" && existingDraft) {
    const draftModule = modules.find((m) => m.id === existingDraft.module_id)?.name ?? "";
    const draftCountry = countries.find((c) => c.id === existingDraft.country_id)?.name ?? "";

    return (
      <div className="max-w-xl rounded-2xl border border-coral p-5">
        <p className="text-sm text-ink">
          {fill(t.draftFound, {
            module: draftModule,
            country: draftCountry,
            time: formatDateTime(existingDraft.saved_at, t.dateLocale),
          })}
        </p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setDraftChoice("continue")}
            className="rounded-xl bg-coral px-4 py-2 text-sm font-medium text-white"
          >
            {t.continueDraft}
          </button>
          <button
            type="button"
            onClick={async () => {
              await discardDraft(existingDraft.id);
              setDraftChoice("fresh");
            }}
            className="rounded-xl px-4 py-2 text-sm text-ink/60 hover:bg-haze"
          >
            {t.startOver}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="draftId" value={draftId ?? ""} />
      <input type="hidden" name="knownLatest" value={latest?.version_number ?? 0} />

      <AnnotationWorkspace
        fileId={fileId}
        driveUrl={fileId ? driveViewUrl(`https://drive.google.com/file/d/${fileId}/preview`) : ""}
        marks={marks}
        setMarks={setMarks}
        editable
        t={t}
        formColumn={
          <div className="flex flex-col gap-4">
            <Field label={t.module}>
              <select
                name="moduleId"
                required
                value={moduleId}
                onChange={(event) => setModuleId(event.target.value)}
                className="input"
              >
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>
                    {module.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label={t.country}>
              {canChooseCountry ? (
                <select
                  name="countryId"
                  required
                  value={countryId}
                  onChange={(event) => setCountryId(event.target.value)}
                  className="input"
                >
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input type="hidden" name="countryId" value={countryId} />
                  <p className="input bg-haze/40 text-ink/60">
                    {countryName || t.noCountryForUpload}
                  </p>
                </>
              )}
            </Field>

            <p className="rounded-xl bg-haze/40 p-3 text-xs text-ink/70">
              {latest
                ? fill(t.existingVersionInfo, {
                    country: countryName,
                    version: latest.version_number,
                    when: formatDateTime(latest.uploaded_at, t.dateLocale),
                    who: latest.uploaded_by_email ?? "?",
                    next: latest.version_number + 1,
                  })
                : fill(t.firstVersionInfo, { country: countryName })}
            </p>

            <Field label={t.driveLink} help={t.driveLinkHelp}>
              <input
                type="text"
                name="driveLink"
                required
                value={driveLink}
                onChange={(event) => setDriveLink(event.target.value)}
                placeholder="https://drive.google.com/file/d/.../view"
                className="input"
              />
            </Field>
          </div>
        }
        panelFooter={
          <div className="flex flex-col gap-3">
            <Field label={t.summaryOptional}>
              <textarea
                name="note"
                rows={3}
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                placeholder={t.whatChangedPlaceholder}
                className="input"
              />
            </Field>

            {/* Stav průběžného ukládání rozpracované verze. */}
            <p id="draft-status" className="text-xs text-ink/50">
              {saveState.error
                ? saveState.error
                : saveState.saving
                  ? t.savingDraft
                  : saveState.savedAt
                    ? fill(t.draftSaved, {
                        time: formatDateTime(saveState.savedAt, t.dateLocale).split(", ")[1] ?? "",
                      })
                    : ""}
            </p>

            <button
              type="submit"
              disabled={isPending || !canPublish}
              className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? t.saving : `${t.uploadAndNotify} (${marks.length})`}
            </button>

            {state && "error" in state && <p className="text-sm text-coral">{state.error}</p>}

            {state && "warning" in state && (
              <div className="rounded-xl border border-coral p-3 text-sm">
                <p className="text-ink">
                  {fill(t.concurrentWarning, {
                    version: state.warning.otherVersion,
                    who: state.warning.otherAuthor,
                    when: formatDateTime(state.warning.otherUploadedAt, t.dateLocale),
                    saved: state.warning.savedVersion,
                  })}
                </p>
                <Link
                  href={`/modules/${state.warning.moduleId}?country=${state.warning.countryId}`}
                  className="mt-2 inline-block font-medium text-coral hover:underline"
                >
                  {t.openThatVersion}
                </Link>
              </div>
            )}
          </div>
        }
      />
    </form>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
      {label}
      {children}
      {help && <span className="text-xs font-normal text-ink/50">{help}</span>}
    </label>
  );
}
