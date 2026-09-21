"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/TextLayer.css";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import type { Dictionary } from "@/lib/i18n";

// Vykreslování běží ve vlastním vlákně prohlížeče, aby stránka neztuhla.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// PDF vykreslené přímo v appce – bez lišty a šedého pozadí, které přidává
// prohlížečová nebo Googlí čtečka. Adresu souboru dostane zvenčí (v appce
// je to vlastní proxy routa /api/pdf/[id]).
export function PdfViewer({ src, t }: { src: string; t: Dictionary }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [failed, setFailed] = useState(false);

  // Stránky vykreslujeme v šířce obalu, aby kolem nezůstávalo prázdné místo.
  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) =>
      setWidth(entry.contentRect.width)
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  if (failed) {
    return <p className="mt-3 text-sm text-ink/50">{t.fileUnavailable}</p>;
  }

  return (
    <div ref={containerRef} className="mt-3 w-full">
      <Document
        file={src}
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
        onLoadError={() => setFailed(true)}
        loading={<PdfPlaceholder text={t.loadingPdf} />}
        error={<p className="text-sm text-ink/50">{t.fileUnavailable}</p>}
      >
        {width > 0 &&
          Array.from({ length: pageCount }, (_, index) => (
            <Page
              key={index}
              pageNumber={index + 1}
              width={width}
              renderAnnotationLayer={false}
              className="mb-2 last:mb-0"
            />
          ))}
      </Document>
    </div>
  );
}

// Dokud se PDF načítá, držíme místo v poměru stránky A4, aby obsah
// pod náhledem neposkakoval.
function PdfPlaceholder({ text }: { text: string }) {
  return (
    <div className="flex w-full items-center justify-center bg-haze/30 aspect-[1/1.414]">
      <p className="text-sm text-ink/50">{text}</p>
    </div>
  );
}
