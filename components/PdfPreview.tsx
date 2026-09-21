"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

// Náhled PDF přímo v appce. U nejnovější verze je otevřený rovnou
// (defaultOpen), u starších se rozbalí až po kliknutí.
export function PdfPreview({
  fileUrl,
  defaultOpen = false,
}: {
  fileUrl: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (!fileUrl) {
    return <p className="text-sm text-ink/50">Soubor se nepodařilo načíst.</p>;
  }

  // Supabase vrací odkaz ke čtení; parametr download navíc říká prohlížeči,
  // že se má soubor stáhnout místo zobrazit.
  const downloadUrl = fileUrl.includes("?")
    ? `${fileUrl}&download=`
    : `${fileUrl}?download=`;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {/* Na širší obrazovce se náhled rozbalí přímo ve stránce. */}
        <button
          type="button"
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="hidden items-center gap-1.5 text-sm font-medium text-coral hover:underline sm:flex"
        >
          <FileText size={16} />
          {open ? "Skrýt PDF" : "Zobrazit PDF"}
        </button>

        {/* Na mobilu bývá vložený náhled PDF nepoužitelný, tam proto
            nabízíme otevření v prohlížeči. */}
        <a
          href={fileUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-coral hover:underline sm:hidden"
        >
          <FileText size={16} />
          Otevřít PDF
        </a>

        <a
          href={downloadUrl}
          className="flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:underline"
        >
          <Download size={16} />
          Stáhnout PDF
        </a>
      </div>

      {open && (
        <iframe
          // Parametry za # jsou pokyny pro prohlížečovou čtečku PDF: skryj
          // boční panel s náhledy stránek a přizpůsob dokument šířce okna.
          src={`${fileUrl}#navpanes=0&view=FitH`}
          title="Náhled PDF"
          className="mt-3 hidden h-[80vh] w-full rounded-xl border border-haze sm:block"
        />
      )}
    </div>
  );
}
