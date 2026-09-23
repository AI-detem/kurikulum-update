"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { matchKey } from "@/lib/match-module";
import type { ModuleWithLatestVersion } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Metodiky, u kterých se zatím nic neděje. Na Přehledu by jich padesát
// jen dělalo šum, tak jsou schované pod rozbalovátkem s hledáním.
export function OtherModules({
  modules,
  countryId,
  t,
}: {
  modules: ModuleWithLatestVersion[];
  countryId: string;
  t: Dictionary;
}) {
  const [otevreno, setOtevreno] = useState(false);
  const [hledani, setHledani] = useState("");

  const nalezene = useMemo(() => {
    const klic = matchKey(hledani);
    if (!klic) return modules;
    return modules.filter(
      (module) =>
        matchKey(module.name).includes(klic) || matchKey(module.category ?? "").includes(klic)
    );
  }, [modules, hledani]);

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
        <div className="mt-3 max-w-3xl">
          <input
            type="search"
            value={hledani}
            onChange={(event) => setHledani(event.target.value)}
            placeholder={t.searchModule}
            className="input w-full"
          />

          {nalezene.length === 0 ? (
            <p className="mt-3 text-sm text-ink/50">{t.nothingFound}</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-1">
              {nalezene.map((module) => (
                <li key={module.id}>
                  <Link
                    href={`/modules/${module.id}?country=${countryId}`}
                    className="flex flex-wrap items-center gap-2 rounded-xl px-3 py-2 hover:bg-haze"
                  >
                    <span className="text-sm text-ink">{module.name}</span>
                    {module.category && (
                      <span className="badge-pill text-ink/50">{module.category}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
