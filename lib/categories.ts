// Dílčí katalogy podpůrných opatření — cílové skupiny žáků se SVP.
export type CategoryCode = 'pas' | 'mp' | 'nks' | 'sp' | 'zp' | 'tp' | 'szn' | 'spuch';

export interface Category {
  code: CategoryCode;
  nazev: string;
  cil: string;
}

export const CATEGORIES: Category[] = [
  { code: 'pas', nazev: 'Poruchy autistického spektra', cil: 'PAS a vybraná psychická onemocnění' },
  { code: 'mp', nazev: 'Mentální postižení', cil: 'mentální postižení nebo oslabení kognitivního výkonu' },
  { code: 'nks', nazev: 'Narušená komunikační schopnost', cil: 'narušená komunikační schopnost' },
  { code: 'sp', nazev: 'Sluchové postižení', cil: 'sluchové postižení nebo oslabení sluchového vnímání' },
  { code: 'zp', nazev: 'Zrakové postižení', cil: 'zrakové postižení nebo oslabení zrakového vnímání' },
  { code: 'tp', nazev: 'Tělesné postižení', cil: 'tělesné postižení nebo závažné onemocnění' },
  { code: 'szn', nazev: 'Sociální znevýhodnění', cil: 'sociální znevýhodnění' },
  { code: 'spuch', nazev: 'Specifické poruchy učení a chování', cil: 'dyslexie, dysgrafie, dysortografie, dyskalkulie · poruchy pozornosti a chování (ADHD/ADD)' },
];

export function isCategoryCode(x: unknown): x is CategoryCode {
  return typeof x === 'string' && CATEGORIES.some((c) => c.code === x);
}

export function getCategory(code: string): Category | undefined {
  return CATEGORIES.find((c) => c.code === code);
}
