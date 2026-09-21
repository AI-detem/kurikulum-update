import type { Dictionary } from "@/lib/i18n";

// Panel vpravo od dokumentu. Zatím ukazuje jen prázdný stav – v dalším kroku
// se do něj dostanou popisy jednotlivých změn v dokumentu.
export function ChangesPanel({ t }: { t: Dictionary }) {
  return (
    <aside className="self-start rounded-2xl border border-haze p-5 doc:sticky doc:top-8 doc:max-h-[calc(100vh-6rem)] doc:overflow-y-auto">
      <h2 className="font-heading text-lg font-bold text-ink">{t.changesPanelTitle}</h2>
      <p className="mt-2 text-sm text-ink/50">{t.changesPanelEmpty}</p>
    </aside>
  );
}
