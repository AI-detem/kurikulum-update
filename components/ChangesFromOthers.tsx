"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { dismissChange, restoreChange } from "@/app/changes/actions";
import { categoryLabel } from "@/lib/annotations";
import { fill } from "@/lib/format";
import { LocalDateTime } from "@/components/LocalDateTime";
import type { PendingChange } from "@/lib/types";
import type { Dictionary, Locale } from "@/lib/i18n";

// Jak dlouho je vidět lišta s vrácením zpět.
const UNDO_MS = 8000;
// Jak dlouho trvá, než odbavená kartička odjede pryč.
const FADE_MS = 200;

type Stav = "pending" | "dismissed";

// Blok se změnami z ostatních zemí. Stojí nad kartami metodik na Přehledu.
//
// Skrytí je dvoukrokové (klik → potvrzení → zápis) a vratné dvakrát:
// hned z lišty dole, nebo kdykoli později ze záložky Skryté.
export function ChangesFromOthers({
  pending,
  dismissed,
  focusModuleId,
  locale,
  t,
}: {
  pending: PendingChange[];
  dismissed: PendingChange[];
  /** Metodika, na jejíž změnu se má hned po otevření odrolovat. */
  focusModuleId?: string;
  /** Jazyk zobrazené země – v něm se ukazují přeložené poznámky. */
  locale: Locale;
  t: Dictionary;
}) {
  const router = useRouter();

  // Co uživatel v téhle relaci přehodil. Server o tom ví taky (zapisuje se
  // rovnou), tohle je jen proto, aby se seznam překreslil bez čekání.
  const [zmeny, setZmeny] = useState<Record<string, Stav>>({});
  const [tab, setTab] = useState<"current" | "hidden">("current");
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [toast, setToast] = useState<PendingChange | null>(null);
  const [error, setError] = useState<string | null>(null);

  const vse = [...pending, ...dismissed];
  const stav = (item: PendingChange): Stav =>
    zmeny[item.id] ?? (item.dismissedAt ? "dismissed" : "pending");

  const current = vse
    .filter((item) => stav(item) === "pending")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const hidden = vse
    .filter((item) => stav(item) === "dismissed")
    .sort((a, b) => (b.dismissedAt ?? "").localeCompare(a.dismissedAt ?? ""));

  const closeConfirm = useCallback(() => setConfirmingId(null), []);

  // Esc a klik mimo kartu potvrzení zavřou.
  useEffect(() => {
    if (!confirmingId) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeConfirm();
    }
    function onPointerDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target?.closest(`[data-zmena-karta="${confirmingId}"]`)) closeConfirm();
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [confirmingId, closeConfirm]);

  const toastTimer = useRef<number | null>(null);

  async function skryt(item: PendingChange) {
    setConfirmingId(null);
    setError(null);
    setLeavingId(item.id);

    // Výpadek sítě by jinak zůstal viset jako nevyřízený slib a kartička
    // by se zasekla v polovině odchodu.
    const result = await dismissChange(item.id).catch((chyba: Error) => ({
      error: chyba.message,
    }));
    if (result.error) {
      setLeavingId(null);
      setError(result.error);
      return;
    }

    window.setTimeout(() => {
      setLeavingId((current) => (current === item.id ? null : current));
      setZmeny((prev) => ({ ...prev, [item.id]: "dismissed" }));
    }, FADE_MS);

    setToast(item);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), UNDO_MS);

    // Semafor i počty na Přehledu se počítají na serveru, musí se přepočítat.
    router.refresh();
  }

  async function vratit(item: PendingChange) {
    setError(null);
    const result = await restoreChange(item.id).catch((chyba: Error) => ({
      error: chyba.message,
    }));
    if (result.error) {
      setError(result.error);
      return;
    }

    setZmeny((prev) => ({ ...prev, [item.id]: "pending" }));
    setToast((current) => (current?.id === item.id ? null : current));
    router.refresh();
  }

  if (current.length === 0 && hidden.length === 0) return null;

  // Bez nevyřízených změn zůstane z bloku jen nenápadný rozbalovák,
  // ať Přehled zbytečně nenabobtná.
  const compact = current.length === 0;
  const zobrazit = compact ? (hiddenOpen ? hidden : null) : tab === "current" ? current : hidden;

  return (
    <section className="mb-8">
      {compact ? (
        <button
          type="button"
          onClick={() => setHiddenOpen((open) => !open)}
          className="text-sm text-ink/50 hover:text-coral"
        >
          {t.tabHidden} ({hidden.length})
        </button>
      ) : (
        <>
          <h2 className="font-heading text-xl font-bold text-ink">
            {fill(t.changesFromOthersCount, { count: current.length })}
          </h2>
          <div role="tablist" className="mt-2 flex gap-1">
            <Tab
              label={`${t.tabCurrent} (${current.length})`}
              selected={tab === "current"}
              onSelect={() => setTab("current")}
            />
            <Tab
              label={`${t.tabHidden} (${hidden.length})`}
              selected={tab === "hidden"}
              onSelect={() => setTab("hidden")}
            />
          </div>
        </>
      )}

      {error && <p className="mt-3 text-sm text-coral">{error}</p>}

      {zobrazit && (
        <ul className="mt-4 flex max-w-3xl flex-col gap-3">
          {zobrazit.length === 0 ? (
            <p className="text-sm text-ink/50">{t.noHiddenChanges}</p>
          ) : (
            zobrazit.map((item) => (
              <ChangeCard
                key={item.id}
                item={item}
                hidden={stav(item) === "dismissed"}
                leaving={leavingId === item.id}
                confirming={confirmingId === item.id}
                focus={focusModuleId === item.moduleId}
                locale={locale}
                t={t}
                onAskDismiss={() => setConfirmingId(item.id)}
                onCancelDismiss={closeConfirm}
                onDismiss={() => skryt(item)}
                onRestore={() => vratit(item)}
              />
            ))
          )}
        </ul>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-sm text-white shadow-lg">
          {t.dismissedToast}
          <button
            type="button"
            onClick={() => vratit(toast)}
            className="font-medium text-mist hover:underline"
          >
            {t.undo}
          </button>
        </div>
      )}
    </section>
  );
}

function Tab({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onSelect}
      className={`border-b-2 px-3 py-1.5 text-sm font-medium transition ${
        selected ? "border-coral text-ink" : "border-transparent text-ink/50 hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}

function ChangeCard({
  item,
  hidden,
  leaving,
  confirming,
  focus,
  locale,
  t,
  onAskDismiss,
  onCancelDismiss,
  onDismiss,
  onRestore,
}: {
  item: PendingChange;
  hidden: boolean;
  leaving: boolean;
  confirming: boolean;
  /** Na tuhle změnu se odrolovalo ze semaforu. */
  focus: boolean;
  locale: Locale;
  t: Dictionary;
  onAskDismiss: () => void;
  onCancelDismiss: () => void;
  onDismiss: () => void;
  onRestore: () => void;
}) {
  const label = categoryLabel(item.category, t);
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Po otevření potvrzení patří fokus na hlavní tlačítko, ať se dá
  // odpovědět klávesnicí.
  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  return (
    <li
      id={`zmena-${item.id}`}
      data-zmena-karta={item.id}
      data-zmena-modul={hidden ? undefined : item.moduleId}
      className={`rounded-2xl border bg-white p-4 transition-all duration-200 ${
        leaving ? "translate-x-3 opacity-0" : "translate-x-0 opacity-100"
      } ${focus ? "border-coral ring-2 ring-coral/30" : "border-haze"}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-heading text-base font-bold text-ink">{item.moduleName}</h3>
        <span className={`badge-pill ${label ? "" : "text-ink/40"}`}>
          {label ?? t.noCategory2}
        </span>
      </div>

      <Note item={item} locale={locale} t={t} />

      <p className="mt-1 text-xs text-ink/50">
        {fill(t.fromCountryVersion, {
          country: item.fromCountryName,
          version: item.versionNumber ?? "?",
        })}{" "}
        · {t.publishedAt}{" "}
        <LocalDateTime value={item.publishedAt ?? item.createdAt} locale={t.dateLocale} /> ·{" "}
        {t.pageLabel} {item.page + 1}
        {hidden && item.dismissedAt && (
          <>
            {" "}
            · {t.hiddenAt}{" "}
            <LocalDateTime value={item.dismissedAt} locale={t.dateLocale} />
          </>
        )}
      </p>

      {hidden ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onRestore}
            className="rounded-xl border border-haze px-3 py-1.5 text-sm text-ink hover:border-coral hover:text-coral"
          >
            {t.restoreToCurrent}
          </button>
        </div>
      ) : confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm text-ink">{t.confirmDismissQuestion}</span>
          <button
            ref={confirmRef}
            type="button"
            onClick={onDismiss}
            className="rounded-xl bg-coral px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            {t.confirmDismissYes}
          </button>
          <button
            type="button"
            onClick={onCancelDismiss}
            className="rounded-xl px-3 py-1.5 text-sm text-ink/60 hover:bg-haze"
          >
            {t.undoShort}
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href={`/changes/${item.id}`}
            className="rounded-xl bg-coral px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            {t.showInDocument}
          </Link>
          {/* Samostatná akce, ne odeslání formuláře. */}
          <button
            type="button"
            onClick={onAskDismiss}
            className="rounded-xl px-3 py-1.5 text-sm text-ink/60 hover:bg-haze"
          >
            {t.notRelevant}
          </button>
        </div>
      )}
    </li>
  );
}

// Poznámka v jazyce zobrazené země. Originál je vždy po ruce – překlad
// dělá stroj a u odborného textu se může minout.
function Note({
  item,
  locale,
  t,
}: {
  item: PendingChange;
  locale: Locale;
  t: Dictionary;
}) {
  const [originalOpen, setOriginalOpen] = useState(false);

  const preklad = item.translations[locale];
  const jazykOriginalu = jazykNazev(item.sourceLocale, t);
  const jeVlastni = !item.sourceLocale || item.sourceLocale === locale;

  if (jeVlastni || (!preklad && !item.translationFailed)) {
    return <p className="mt-2 text-sm text-ink">{item.note}</p>;
  }

  if (!preklad) {
    return (
      <div className="mt-2">
        <p className="text-sm text-ink">{item.note}</p>
        <p className="mt-0.5 text-xs text-coral">{t.translationFailed}</p>
      </div>
    );
  }

  return (
    <div className="mt-2">
      <p className="text-sm text-ink">{originalOpen ? item.note : preklad}</p>
      <button
        type="button"
        onClick={() => setOriginalOpen((open) => !open)}
        className="mt-0.5 text-xs text-ink/40 hover:text-coral"
      >
        {originalOpen
          ? t.showTranslation
          : fill(t.machineTranslatedFrom, { language: jazykOriginalu })}
      </button>
    </div>
  );
}

function jazykNazev(locale: string | null, t: Dictionary): string {
  if (locale === "sk") return t.langSk;
  if (locale === "en") return t.langEn;
  if (locale === "hu") return t.langHu;
  return t.langCs;
}
