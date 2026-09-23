"use client";

import { StatusDot } from "@/components/StatusDot";
import type { CountryLight } from "@/lib/types";

// Jak dlouho zůstane změna po odrolování zvýrazněná.
const HIGHLIGHT_MS = 2000;

// Tečka semaforu na kartě metodiky. Když je co řešit, odroluje na první
// nevyřízenou změnu té metodiky v bloku nad kartami.
export function ModuleLightDot({
  moduleId,
  light,
  label,
}: {
  moduleId: string;
  light: CountryLight;
  label: string;
}) {
  if (light === "green") {
    return <StatusDot light={light} label={label} size={10} />;
  }

  function scrollToChange() {
    const card = document.querySelector<HTMLElement>(`[data-zmena-modul="${moduleId}"]`);
    if (!card) return;

    card.scrollIntoView({ behavior: "smooth", block: "center" });
    // Zvýraznění je jen dočasná vizuální stopa, proto přímo na prvku –
    // není důvod kvůli němu držet stav v Reactu.
    card.classList.add("ring-2", "ring-coral", "border-coral");
    window.setTimeout(
      () => card.classList.remove("ring-2", "ring-coral", "border-coral"),
      HIGHLIGHT_MS
    );
  }

  return (
    <button
      type="button"
      onClick={scrollToChange}
      title={label}
      className="rounded-full p-1 hover:bg-haze"
    >
      <StatusDot light={light} label={label} size={10} />
    </button>
  );
}
