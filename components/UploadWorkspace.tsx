"use client";

import { useActionState, useState } from "react";
import { uploadDocumentVersion, type UploadState } from "@/app/admin/upload/actions";
import { AnnotationWorkspace } from "@/components/annotations/AnnotationWorkspace";
import { driveViewUrl, extractDriveFileId } from "@/lib/drive";
import type { Country, Mark, Module } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Pracovní plocha pro novou verzi: vlevo formulář, uprostřed dokument
// se značkami, vpravo jejich popisy.
export function UploadWorkspace({
  modules,
  countries,
  defaultCountryId,
  canChooseCountry,
  t,
}: {
  modules: Module[];
  countries: Country[];
  defaultCountryId: string | null;
  canChooseCountry: boolean;
  t: Dictionary;
}) {
  const [driveLink, setDriveLink] = useState("");
  const [marks, setMarks] = useState<Mark[]>([]);
  const [summary, setSummary] = useState("");
  const [state, formAction, isPending] = useActionState<UploadState, FormData>(
    uploadDocumentVersion,
    null
  );

  const fileId = extractDriveFileId(driveLink);

  return (
    <form action={formAction}>
      {/* Značky posíláme s formulářem jako jedno pole. */}
      <input type="hidden" name="marks" value={JSON.stringify(marks)} />

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
              <select name="moduleId" required className="input">
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
                  defaultValue={defaultCountryId ?? ""}
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
                  <input type="hidden" name="countryId" value={defaultCountryId ?? ""} />
                  <p className="input bg-haze/40 text-ink/60">
                    {countries.find((country) => country.id === defaultCountryId)?.name ??
                      t.noCountryForUpload}
                  </p>
                </>
              )}
            </Field>

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

            {state?.error && <p className="text-sm text-coral">{state.error}</p>}
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
