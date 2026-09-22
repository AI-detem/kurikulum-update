"use client";

import { useState } from "react";
import { AnnotationWorkspace } from "@/components/annotations/AnnotationWorkspace";
import type { Mark } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

// Dokument jiné země, otevřený na konkrétní vyznačené změně.
// Jen ke čtení – upravovat cizí značky nejde, proto se seznam značek
// drží ve stavu jen kvůli tvaru, který AnnotationWorkspace očekává.
export function SharedVersionView({
  fileId,
  driveUrl,
  marks,
  focusMarkId,
  t,
}: {
  fileId: string | null;
  driveUrl: string;
  marks: Mark[];
  focusMarkId: string;
  t: Dictionary;
}) {
  const [readOnlyMarks] = useState(marks);

  return (
    <AnnotationWorkspace
      fileId={fileId}
      driveUrl={driveUrl}
      marks={readOnlyMarks}
      setMarks={() => {}}
      editable={false}
      focusMarkId={focusMarkId}
      t={t}
    />
  );
}
