"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import type { Dictionary } from "@/lib/i18n";

// Vykreslování běží ve vlastním vlákně prohlížeče, aby stránka neztuhla.
// Soubor s vláknem se do /public kopíruje při instalaci (viz postinstall
// v package.json), takže jeho verze vždy sedí s verzí knihovny a appka
// nezávisí na cizí síti.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// PDF vykreslené přímo v appce: všechny stránky pod sebou, bílé listy
// s jemným stínem, žádná lišta čtečky ani rámeček.
export function PdfViewer({
  src,
  driveUrl,
  t,
}: {
  src: string;
  /** Odkaz na soubor v Drive pro případ, že se vykreslení nepovede. */
  driveUrl: string;
  t: Dictionary;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pageCount, setPageCount] = useState(0);

  // Stránky vykreslujeme v šířce kontejneru, ať kolem nezůstává prázdné místo.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={src}
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
        loading={<PdfSkeleton text={t.loadingPdf} />}
        error={<PdfError t={t} driveUrl={driveUrl} />}
        noData={<PdfSkeleton text={t.loadingPdf} />}
      >
        {width > 0 &&
          Array.from({ length: pageCount }, (_, index) => (
            <Page
              key={index}
              pageNumber={index + 1}
              width={width}
              renderAnnotationLayer={false}
              className="mb-3 bg-white shadow-sm last:mb-0"
            />
          ))}
      </Document>
    </div>
  );
}

// Během načítání držíme místo v poměru stránky A4, ať obsah pod dokumentem
// neposkakuje.
function PdfSkeleton({ text }: { text: string }) {
  return (
    <div className="flex w-full animate-pulse items-center justify-center bg-haze/40 aspect-[1/1.414]">
      <p className="text-sm text-ink/50">{text}</p>
    </div>
  );
}

function PdfError({ t, driveUrl }: { t: Dictionary; driveUrl: string }) {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-2 bg-haze/40 py-12">
      <p className="text-sm text-ink/60">{t.pdfLoadFailed}</p>
      <a
        href={driveUrl}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-medium text-coral hover:underline"
      >
        {t.openInDrive}
      </a>
    </div>
  );
}
