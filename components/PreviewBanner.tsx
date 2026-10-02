import { stopPreview } from "@/app/admin/actions";
import { fill } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

// Pruh přes celou šířku, dokud má admin zapnutý náhled jako editor.
// Bez něj by se dalo snadno zapomenout, že appka schválně ukazuje míň.
export function PreviewBanner({ countryName, t }: { countryName: string; t: Dictionary }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 bg-ink px-4 py-2 text-sm text-white">
      {fill(t.previewBanner, { country: countryName })}
      <form action={stopPreview}>
        <button type="submit" className="font-medium text-mist underline hover:text-white">
          {t.previewEnd}
        </button>
      </form>
    </div>
  );
}
