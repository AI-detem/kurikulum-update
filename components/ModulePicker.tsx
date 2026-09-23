"use client";

import { useMemo, useRef, useState } from "react";
import { matchKey, type MatchResult } from "@/lib/match-module";
import { fill } from "@/lib/format";
import type { Module } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Výběr metodiky při nahrávání. Metodik je kolem padesáti, proto jsou
// seskupené po sekcích a nad výběrem je hledání.
//
// Rozpoznání z PDF metodiku jen předvyplní. Nabídka zůstává vidět vždy,
// aby šel návrh kdykoli přepsat.
export function ModulePicker({
  modules,
  value,
  onChange,
  recognition,
  t,
}: {
  modules: Module[];
  value: string;
  onChange: (moduleId: string) => void;
  /** Výsledek rozpoznání z nahrávaného dokumentu. */
  recognition: MatchResult | null;
  t: Dictionary;
}) {
  const [hledani, setHledani] = useState("");
  const [navrhSkryt, setNavrhSkryt] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);

  const skupiny = useMemo(() => {
    const klic = matchKey(hledani);
    const odpovida = (module: Module) =>
      klic.length === 0 ||
      matchKey(module.name).includes(klic) ||
      matchKey(module.name_en ?? "").includes(klic) ||
      matchKey(module.category ?? "").includes(klic);

    const mapa = new Map<string, Module[]>();
    for (const module of modules) {
      // Vybraná metodika zůstává v nabídce i při hledání, jinak by ji
      // prohlížeč z výběru vyhodil.
      if (!odpovida(module) && module.id !== value) continue;
      const sekce = module.category ?? t.ungrouped;
      mapa.set(sekce, [...(mapa.get(sekce) ?? []), module]);
    }
    return [...mapa.entries()];
  }, [modules, hledani, value, t.ungrouped]);

  const pocet = skupiny.reduce((soucet, [, seznam]) => soucet + seznam.length, 0);

  // Návrh visí nad nabídkou jen dokud platí. Jakmile uživatel vybere něco
  // jiného, zmizí – jinak by karta tvrdila něco, co ve výběru není.
  const ukazatNavrh =
    recognition?.kind === "match" && !navrhSkryt && value === recognition.best.moduleId;
  const ukazatNabidku = recognition?.kind === "choice" && !navrhSkryt && value === "";

  function vybrat(moduleId: string) {
    onChange(moduleId);
    setNavrhSkryt(true);
  }

  return (
    <div className="flex flex-col gap-2">
      {ukazatNavrh && recognition?.kind === "match" && (
        <p className="flex flex-wrap items-center gap-2 rounded-xl border border-coral px-3 py-2 text-sm text-ink">
          {fill(t.recognizedAs, { name: recognition.best.name })}
          <button
            type="button"
            onClick={() => {
              setNavrhSkryt(true);
              selectRef.current?.focus();
            }}
            className="font-medium text-coral hover:underline"
          >
            {t.change}
          </button>
        </p>
      )}

      {ukazatNabidku && recognition?.kind === "choice" && (
        <div className="rounded-xl bg-haze/40 px-3 py-2">
          <p className="text-xs text-ink/60">{t.maybeOneOf}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {recognition.candidates.map((candidate) => (
              <button
                key={candidate.moduleId}
                type="button"
                onClick={() => vybrat(candidate.moduleId)}
                className="badge-pill hover:bg-coral hover:text-white"
              >
                {candidate.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <input
        type="search"
        value={hledani}
        onChange={(event) => setHledani(event.target.value)}
        placeholder={t.searchModule}
        className="input"
      />

      <select
        ref={selectRef}
        name="moduleId"
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        size={Math.min(Math.max(pocet + skupiny.length, 4), 12)}
        className="input"
      >
        {skupiny.map(([sekce, seznam]) => (
          <optgroup key={sekce} label={sekce}>
            {seznam.map((module) => (
              <option key={module.id} value={module.id}>
                {module.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {pocet === 0 && <p className="text-xs text-ink/50">{t.nothingFound}</p>}
    </div>
  );
}
