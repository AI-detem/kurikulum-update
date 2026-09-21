"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { uploadDocumentVersion, type UploadState } from "@/app/admin/upload/actions";
import { AnnotationWorkspace } from "@/components/annotations/AnnotationWorkspace";
import { driveViewUrl, extractDriveFileId } from "@/lib/drive";
import { fill, formatDateTime } from "@/lib/format";
import type { Country, Mark, Module } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Poslední verze pro dvojici modul + země, aby bylo vidět, na co se navazuje.
export type LatestVersion = {
  module_id: string;
  country_id: string;
  version_number: number;
  uploaded_at: string;
  uploaded_by_email: string | null;
};

// Jak dlouho po posledním úhozu se začne načítat náhled. Bez toho by se
// dokument překresloval při každém napsaném znaku.
const LINK_DEBOUNCE_MS = 500;

export function UploadWorkspace({
  modules,
  countries,
  defaultCountryId,
  canChooseCountry,
  latestVersions,
  t,
}: {
  modules: Module[];
  countries: Country[];
  defaultCountryId: string | null;
  canChooseCountry: boolean;
  latestVersions: LatestVersion[];
  t: Dictionary;
}) {
  const [driveLink, setDriveLink] = useState("");
  // Odkaz pro načtení dokumentu je oddělený od pole, do kterého se píše.
  const [linkForPreview, setLinkForPreview] = useState("");
  const [moduleId, setModuleId] = useState(modules[0]?.id ?? "");
  const [countryId, setCountryId] = useState(defaultCountryId ?? "");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [summary, setSummary] = useState("");
  const [state, formAction, isPending] = useActionState<UploadState, FormData>(
    uploadDocumentVersion,
    null
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setLinkForPreview(driveLink), LINK_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [driveLink]);

  const fileId = extractDriveFileId(linkForPreview);
  const latest = latestVersions.find(
    (version) => version.module_id === moduleId && version.country_id === countryId
  );
  const countryName = countries.find((country) => country.id === countryId)?.name ?? "";

  return (
    <form action={formAction}>
      {/* Značky a stav, ze kterého uživatel vycházel, posíláme s formulářem. */}
      <input type="hidden" name="marks" value={JSON.stringify(marks)} />
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

            {/* Na co nová verze navazuje a jaké dostane číslo. */}
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

            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? t.saving : `${t.uploadAndNotify} (${marks.length})`}
            </button>

            {state && "error" in state && (
              <p className="text-sm text-coral">{state.error}</p>
            )}

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
