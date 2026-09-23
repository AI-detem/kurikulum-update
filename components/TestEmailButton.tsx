"use client";

import { useState } from "react";
import { sendTestEmail } from "@/app/admin/actions";
import type { Dictionary } from "@/lib/i18n";

// Zkušební notifikace na adresu přihlášeného admina. Ověřuje, že odesílání
// e-mailů opravdu funguje, aniž by se kvůli tomu musela nahrávat verze.
export function TestEmailButton({ t }: { t: Dictionary }) {
  const [stav, setStav] = useState<"idle" | "sending">("idle");
  const [vysledek, setVysledek] = useState<{ ok: boolean; text: string } | null>(null);

  async function poslat() {
    setStav("sending");
    setVysledek(null);

    const result = await sendTestEmail().catch((chyba: Error) => ({ error: chyba.message }));
    setStav("idle");
    setVysledek(
      "error" in result ? { ok: false, text: result.error } : { ok: true, text: t.testEmailSent }
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-ink/50">{t.testEmailHint}</p>
      <div>
        <button
          type="button"
          onClick={poslat}
          disabled={stav === "sending"}
          className="rounded-xl border border-haze px-4 py-2 text-sm text-ink hover:border-coral disabled:opacity-50"
        >
          {stav === "sending" ? t.saving : t.testEmail}
        </button>
      </div>
      {vysledek && (
        <p className={`text-sm ${vysledek.ok ? "text-ink" : "text-coral"}`}>
          {vysledek.ok ? vysledek.text : `${t.testEmailFailed} ${vysledek.text}`}
        </p>
      )}
    </div>
  );
}
