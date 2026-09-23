"use client";

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import type { Dictionary } from "@/lib/i18n";

// Tlačítko ve formuláři, které nejdřív otevře potvrzovací okno a formulář
// odešle až po potvrzení. Používá se u serverových akcí v Administraci.
export function ConfirmSubmit({
  label,
  title,
  explanation,
  confirmLabel,
  detail,
  className = "text-sm text-ink/50 hover:text-coral",
  t,
}: {
  label: string;
  title: string;
  explanation: string;
  confirmLabel: string;
  /** Čeho se potvrzení týká, například název metodiky. */
  detail?: string;
  className?: string;
  t: Dictionary;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button ref={buttonRef} type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      <ConfirmDialog
        open={open}
        title={title}
        explanation={explanation}
        confirmLabel={confirmLabel}
        cancelLabel={t.cancel}
        closeLabel={t.close}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          // requestSubmit spustí serverovou akci formuláře, ve kterém
          // tlačítko stojí – stejně, jako kdyby byl typu submit.
          buttonRef.current?.form?.requestSubmit();
        }}
      >
        {detail && <p className="text-sm font-medium text-ink">{detail}</p>}
      </ConfirmDialog>
    </>
  );
}
