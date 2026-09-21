"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { driveViewUrl, isDrivePreviewUrl } from "@/lib/drive";
import type { Dictionary } from "@/lib/i18n";

// Náhled PDF z Google Drive vložený přímo ve stránce. U nejnovější verze
// je otevřený rovnou (defaultOpen), u starších se rozbalí po kliknutí.
export function PdfPreview({
  fileUrl,
  defaultOpen = false,
  t,
}: {
  fileUrl: string;
  defaultOpen?: boolean;
  t: Dictionary;
}) {
  const [open, setOpen] = useState(defaultOpen);

  // Jediná podmínka je tvar odkazu. Starší verze z doby, kdy se PDF nahrávala
  // do Supabase Storage, mají ve file_url jen cestu k souboru – ty appka
  // zobrazit neumí. Platný odkaz na Drive vkládáme vždy, bez ověřování
  // dostupnosti (to z prohlížeče stejně nejde).
  if (!isDrivePreviewUrl(fileUrl)) {
    return <p className="text-sm text-ink/50">{t.fileUnavailable}</p>;
  }

  // Na stránce souboru v Drive má člověk vlastní tlačítko stažení.
  const viewUrl = driveViewUrl(fileUrl);

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
          {open ? t.hidePdf : t.viewPdf}
        </button>

        {/* Na mobilu bývá vložený náhled nepoužitelný, tam proto nabízíme
            otevření přímo v Drive. */}
        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-coral hover:underline sm:hidden"
        >
          <FileText size={16} />
          {t.openPdf}
        </a>

        <a
          href={viewUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-sm font-medium text-ink/60 hover:underline"
        >
          <Download size={16} />
          {t.downloadPdf}
        </a>
      </div>

      {open && (
        <iframe
          src={fileUrl}
          title={t.pdfPreview}
          // Poměr stránky A4, ať kolem dokumentu nezůstává prázdné místo.
          className="mt-3 hidden aspect-[1/1.414] w-full border-0 sm:block"
        />
      )}
    </div>
  );
}
