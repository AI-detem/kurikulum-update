"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { applyCatalogImport, previewCatalogImport } from "@/app/admin/catalog-actions";
import type { ImportPlan } from "@/lib/catalog-plan";
import { fill } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

// Import katalogu ze zdrojového webu. Nejdřív náhled, teprve po potvrzení
// se zapisuje.
export function CatalogImport({ t }: { t: Dictionary }) {
  const router = useRouter();
  const [stav, setStav] = useState<"idle" | "loading" | "preview" | "saving" | "done">("idle");
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [hlaska, setHlaska] = useState<string | null>(null);
  const [chyba, setChyba] = useState<string | null>(null);

  async function nacist() {
    setStav("loading");
    setChyba(null);
    setHlaska(null);

    const result = await previewCatalogImport().catch((e: Error) => ({ error: e.message }));
    if ("error" in result) {
      setStav("idle");
      setChyba(result.error);
      return;
    }

    setPlan(result.plan);
    setStav("preview");
  }

  async function potvrdit() {
    setStav("saving");
    const result = await applyCatalogImport().catch((e: Error) => ({ error: e.message }));

    if ("error" in result) {
      setStav("preview");
      setChyba(result.error);
      return;
    }

    setHlaska(fill(t.catalogDone, result));
    setPlan(null);
    setStav("done");
    router.refresh();
  }

  const nenicoMenit =
    plan !== null &&
    plan.toAdd.length === 0 &&
    plan.toRename.length === 0 &&
    plan.toLink.length === 0 &&
    plan.toArchive.length === 0;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink/50">{t.catalogHint}</p>

      <div>
        <button
          type="button"
          onClick={nacist}
          disabled={stav === "loading" || stav === "saving"}
          className="rounded-xl bg-coral px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {stav === "loading" ? t.catalogLoading : t.catalogLoad}
        </button>
      </div>

      {chyba && <p className="text-sm text-coral">{chyba}</p>}
      {hlaska && <p className="text-sm text-ink">{hlaska}</p>}

      {plan && (
        <div className="rounded-2xl border border-haze p-4">
          <h3 className="font-heading text-base font-bold text-ink">
            {t.catalogPreviewTitle}
          </h3>

          {plan.warnings.map((warning) => (
            <p key={warning} className="mt-2 text-xs text-coral">
              {warning}
            </p>
          ))}

          {nenicoMenit ? (
            <p className="mt-2 text-sm text-ink/60">{t.catalogNothingToDo}</p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              <Skupina
                titulek={fill(t.catalogWillAdd, { count: plan.toAdd.length })}
                polozky={plan.toAdd.map((m) => `${m.name}${m.section ? ` — ${m.section}` : ""}`)}
              />
              <Skupina
                titulek={fill(t.catalogWillRename, { count: plan.toRename.length })}
                polozky={plan.toRename.map((m) => `${m.from} → ${m.to}`)}
              />
              <Skupina
                titulek={fill(t.catalogWillLink, { count: plan.toLink.length })}
                polozky={plan.toLink.map((m) => m.name)}
              />
              <Skupina
                titulek={fill(t.catalogWillArchive, { count: plan.toArchive.length })}
                polozky={plan.toArchive.map((m) => m.name)}
              />
            </div>
          )}

          <p className="mt-3 text-xs text-ink/50">
            {fill(t.catalogUnchanged, { count: plan.unchanged, total: plan.total })}
          </p>

          <div className="mt-4 flex gap-2">
            {!nenicoMenit && (
              <button
                type="button"
                onClick={potvrdit}
                disabled={stav === "saving"}
                className="rounded-xl bg-coral px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {stav === "saving" ? t.saving : t.catalogConfirm}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setPlan(null);
                setStav("idle");
              }}
              className="rounded-xl px-4 py-2 text-sm text-ink/60 hover:bg-haze"
            >
              {t.catalogCancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Skupina({ titulek, polozky }: { titulek: string; polozky: string[] }) {
  if (polozky.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-semibold text-ink">{titulek}</p>
      <ul className="mt-1 flex flex-col gap-0.5 text-sm text-ink/70">
        {polozky.map((polozka) => (
          <li key={polozka}>{polozka}</li>
        ))}
      </ul>
    </div>
  );
}
