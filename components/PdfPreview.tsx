"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Download, FileText } from "lucide-react";
import { driveViewUrl, extractDriveFileId } from "@/lib/drive";
import type { Dictionary } from "@/lib/i18n";

// Renderer PDF běží jen v prohlížeči, na serveru by sestavení spadlo.
const PdfViewer = dynamic(
  () => import("@/components/PdfViewer").then((m) => m.PdfViewer),
  { ssr: false }
);

// PDF vykreslené vlastním rendererem. U nejnovější verze je otevřené rovnou
// (defaultOpen), u starších se rozbalí po kliknutí.
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

  // Starší verze z doby, kdy se PDF nahrávala do Supabase Storage, nemají
  // odkaz na Drive – ty už appka zobrazit neumí.
  const fileId = extractDriveFileId(fileUrl);
  if (!fileId) {
    return <p className="text-sm text-ink/50">{t.fileUnavailable}</p>;
  }

  // Na stránce souboru v Drive má člověk vlastní tlačítko stažení.
  const viewUrl = driveViewUrl(fileUrl);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        {/* Na širší obrazovce se dokument rozbalí přímo ve stránce. */}
        <button
          type="button"
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="hidden items-center gap-1.5 text-sm font-medium text-coral hover:underline sm:flex"
        >
          <FileText size={16} />
          {open ? t.hidePdf : t.viewPdf}
        </button>

        {/* Na mobilu je vykreslování PDF pomalé, tam nabízíme otevření
            přímo v Drive. */}
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
        <div className="mt-3 hidden sm:block">
          <PdfViewer src={`/api/pdf/${fileId}`} driveUrl={viewUrl} t={t} />
        </div>
      )}
    </div>
  );
}
