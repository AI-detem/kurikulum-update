"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SECTION_ORDER } from "@/lib/catalog";
import { matchKey } from "@/lib/match-module";
import { StatusDot } from "@/components/StatusDot";
import type { CountryLight, ModuleWithLatestVersion } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Celý katalog metodik, rozbalený pod Přehledem. Padesát položek v jednom
// sloupci se nedalo číst, proto jsou rozdělené po sekcích jako na webu
// a vysázené do mřížky.
export function OtherModules({
  modules,
  lights,
  countryId,
  t,
}: {
  modules: ModuleWithLatestVersion[];
  /** Stav každé metodiky pro právě zobrazenou zemi. */
  lights: Record<string, CountryLight>;
  countryId: string;
  t: Dictionary;
}) {
  const [otevreno, setOtevreno] = useState(false);
  const [hledani, setHledani] = useState("");

  const sekce = useMemo(() => {
    const klic = matchKey(hledani);
    const nalezene = klic
      ? modules.filter(
          (module) =>
            matchKey(module.name).includes(klic) ||
            matchKey(module.category ?? "").includes(klic)
        )
      : modules;

    const mapa = new Map<string, ModuleWithLatestVersion[]>();
    for (const module of nalezene) {
      const nazev = module.category ?? t.ungrouped;
      mapa.set(nazev, [...(mapa.get(nazev) ?? []), module]);
    }

    // Pořadí sekcí drží web; co do žádné známé nepatří, jde nakonec.
    return [...mapa.entries()]
      .sort((a, b) => poradi(a[0], t) - poradi(b[0], t))
      .map(
        ([nazev, seznam]) =>
          [
            nazev,
            // Uvnitř sekce pořadí z webu, čísla v názvu ho drží.
            [...seznam].sort(
              (a, b) => a.order_index - b.order_index || a.name.localeCompare(b.name)
            ),
          ] as const
      );
  }, [modules, hledani, t]);

  if (modules.length === 0) return null;

  return (
    <section className="mt-8">
      <button
        type="button"
        onClick={() => setOtevreno((value) => !value)}
        className="text-sm font-medium text-ink/60 hover:text-coral"
      >
        {otevreno ? t.hideAllModules : `${t.allModules} (${modules.length})`}
      </button>

      {otevreno && (
        <div className="mt-4">
          <input
            type="search"
            value={hledani}
            onChange={(event) => setHledani(event.target.value)}
            placeholder={t.searchModule}
            className="input w-full max-w-md"
          />

          <Legenda t={t} />

          {sekce.length === 0 ? (
            <p className="mt-4 text-sm text-ink/50">{t.nothingFound}</p>
          ) : (
            <div className="mt-6 flex flex-col gap-7">
              {sekce.map(([nazev, seznam]) => (
                <div key={nazev}>
                  <h3 className="dashed-divider pb-2 font-heading text-base font-bold text-ink">
                    {nazev}{" "}
                    <span className="font-sans text-sm font-normal text-ink/40">
                      ({seznam.length})
                    </span>
                  </h3>

                  <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2 wide:grid-cols-4">
                    {seznam.map((module) => {
                      const light = lights[module.id] ?? "none";
                      const popis = lightLabelFor(light, t);

                      return (
                        <li key={module.id}>
                          <Link
                            href={`/modules/${module.id}?country=${countryId}`}
                            className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-haze"
                          >
                            {/* flex, ne inline: jinak si span přidá místo
                                pro dotahy písmen a tečka klesne pod text. */}
                            <span className="mt-1.5 flex shrink-0">
                              <StatusDot light={light} label={popis} size={8} />
                            </span>
                            <span className="text-sm text-ink">{module.name}</span>
                            {/* Barva sama o sobě informaci nenese – pro
                                odečítače obrazovky je tu i slovy. */}
                            <span className="sr-only">{popis}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Legenda({ t }: { t: Dictionary }) {
  const polozky: [CountryLight, string][] = [
    ["none", t.lightNone],
    ["green", t.lightOk],
    ["yellow", t.lightWaiting],
    ["red", t.lightAct],
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/50">
      <span>{t.legendTitle}:</span>
      {polozky.map(([light, popis]) => (
        <span key={light} className="flex items-center gap-1.5">
          <StatusDot light={light} label={popis} size={8} />
          {popis}
        </span>
      ))}
    </div>
  );
}

function lightLabelFor(light: CountryLight, t: Dictionary): string {
  if (light === "red") return t.lightAct;
  if (light === "yellow") return t.lightWaiting;
  if (light === "none") return t.lightNone;
  return t.lightOk;
}

function poradi(nazev: string, t: Dictionary): number {
  if (nazev === t.ungrouped) return SECTION_ORDER.length + 1;

  const index = SECTION_ORDER.indexOf(nazev as (typeof SECTION_ORDER)[number]);
  return index === -1 ? SECTION_ORDER.length : index;
}
