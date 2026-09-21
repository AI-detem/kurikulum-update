// Datum a čas verze. V databázi je uložený v UTC, tady se převádí
// do místního času prohlížeče, ať jdou rozlišit dvě verze z jednoho dne.
export function formatDateTime(value: string, locale: string): string {
  return new Date(value).toLocaleString(locale, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Doplnění hodnot do textu ze slovníku, např. "verze {version}".
export function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match
  );
}
