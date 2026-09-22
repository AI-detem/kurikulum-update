"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dismissChange } from "@/app/changes/actions";
import { categoryLabel } from "@/lib/annotations";
import { fill } from "@/lib/format";
import { LocalDateTime } from "@/components/LocalDateTime";
import type { PendingChange } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Kolik času má uživatel na to vzít "Netýká se nás" zpátky.
const UNDO_MS = 5000;
// Jak dlouho trvá, než kartička zmizí.
const FADE_MS = 200;

// Seznam změn z ostatních zemí, na které naše země ještě nereagovala.
// Odbavení funguje stejně jako mazání značky: kartička zmizí, pět vteřin
// je vidět lišta se "Zpět" a teprve pak se stav zapíše do databáze.
export function ChangesFromOthers({
  items,
  t,
}: {
  items: PendingChange[];
  t: Dictionary;
}) {
  const router = useRouter();
  const [fadingId, setFadingId] = useState<string | null>(null);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [toast, setToast] = useState<PendingChange | null>(null);

  // Časovače běžící pro jednotlivé odbavené změny. Každá má svůj vlastní,
  // aby rychlé odbavení dvou za sebou neshodilo to první.
  const timers = useRef<Map<string, number>>(new Map());

  // Odchod ze stránky odbaví to, co má odpočet rozběhnutý – jinak by se
  // kliknutí ztratilo. Zápis je idempotentní, takže nevadí, když mezitím
  // stihne proběhnout i časovač.
  useEffect(() => {
    const running = timers.current;
    return () => {
      for (const [id, timer] of running) {
        window.clearTimeout(timer);
        void dismissChange(id);
      }
      running.clear();
    };
  }, []);

  function dismiss(item: PendingChange) {
    setFadingId(item.id);
    window.setTimeout(() => {
      setFadingId((current) => (current === item.id ? null : current));
      setHiddenIds((current) => [...current, item.id]);
    }, FADE_MS);

    setToast(item);
    timers.current.set(
      item.id,
      window.setTimeout(async () => {
        timers.current.delete(item.id);
        await dismissChange(item.id);
        setToast((current) => (current?.id === item.id ? null : current));
        router.refresh();
      }, UNDO_MS)
    );
  }

  function undo(item: PendingChange) {
    const timer = timers.current.get(item.id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(item.id);
    setHiddenIds((current) => current.filter((id) => id !== item.id));
    setToast(null);
  }

  const visible = items.filter((item) => !hiddenIds.includes(item.id));

  if (visible.length === 0) {
    return <p className="text-sm text-ink/50">{t.changesFromOthersEmpty}</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {visible.map((item) => {
          const label = categoryLabel(item.category, t);

          return (
            <li
              key={item.id}
              className={`rounded-2xl border border-haze bg-white p-4 transition-opacity duration-200 ${
                fadingId === item.id ? "opacity-0" : "opacity-100"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading text-base font-bold text-ink">
                  {item.moduleName}
                </h3>
                <span className={`badge-pill ${label ? "" : "text-ink/40"}`}>
                  {label ?? t.noCategory2}
                </span>
              </div>

              <p className="mt-2 text-sm text-ink">{item.note}</p>

              <p className="mt-1 text-xs text-ink/50">
                {fill(t.fromCountryVersion, {
                  country: item.fromCountryName,
                  version: item.versionNumber ?? "?",
                })}{" "}
                · <LocalDateTime value={item.createdAt} locale={t.dateLocale} /> ·{" "}
                {t.pageLabel} {item.page + 1}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/changes/${item.id}`}
                  className="rounded-xl bg-coral px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
                >
                  {t.showInDocument}
                </Link>
                {/* Samostatná akce, ne odeslání formuláře – kartička se
                    může zobrazovat i uvnitř jiného formuláře. */}
                <button
                  type="button"
                  onClick={() => dismiss(item)}
                  className="rounded-xl px-3 py-1.5 text-sm text-ink/60 hover:bg-haze"
                >
                  {t.notRelevant}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          {t.dismissedToast}
          <button
            type="button"
            onClick={() => undo(toast)}
            className="font-medium text-mist hover:underline"
          >
            {t.undoShort}
          </button>
        </div>
      )}
    </>
  );
}
