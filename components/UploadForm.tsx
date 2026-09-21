"use client";

import { useActionState } from "react";
import { uploadDocumentVersion, type UploadState } from "@/app/admin/upload/actions";
import type { Country, Module } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

export function UploadForm({
  modules,
  countries,
  defaultCountryId,
  canChooseCountry,
  t,
}: {
  modules: Module[];
  countries: Country[];
  defaultCountryId: string | null;
  /** Admin přidává verzi pro libovolnou zemi, editor jen pro tu svou. */
  canChooseCountry: boolean;
  t: Dictionary;
}) {
  const [state, formAction, isPending] = useActionState<UploadState, FormData>(
    uploadDocumentVersion,
    null
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
          placeholder="https://drive.google.com/file/d/.../view"
          className="input"
        />
      </Field>

      <Field label={`${t.changeCategory} (${t.optional})`}>
        <input
          type="text"
          name="category"
          placeholder={t.changeCategoryPlaceholder}
          className="input"
        />
      </Field>

      <Field label={t.whatChanged}>
        <textarea
          name="note"
          required
          rows={4}
          placeholder={t.whatChangedPlaceholder}
          className="input"
        />
      </Field>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 rounded-xl bg-coral px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? t.saving : t.uploadAndNotify}
      </button>

      {state?.error && <p className="text-sm text-coral">{state.error}</p>}
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
