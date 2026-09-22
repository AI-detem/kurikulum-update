// Datum a čas verze. V databázi je uložený v UTC, tady se převádí
// do místního času prohlížeče, ať jdou rozlišit dvě verze z jednoho dne.
export function formatDateTime(value: string, locale: string, timeZone?: string): string {
  return new Date(value).toLocaleString(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

// Doplnění hodnot do textu ze slovníku, např. "verze {version}".
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match
  );
}

// Počet s tvarem podle češtiny/slovenštiny (1 / 2–4 / 5 a víc).
// Tvary jsou ve slovníku oddělené svislítkem.
export function pluralCount(count: number, forms: string, locale: string): string {
  const [one, few, many] = forms.split("|");
  if (locale.startsWith("cs") || locale.startsWith("sk")) {
    if (count === 1) return `${count} ${one}`;
    if (count >= 2 && count <= 4) return `${count} ${few}`;
    return `${count} ${many ?? few}`;
  }
  return `${count} ${count === 1 ? one : few}`;
}
