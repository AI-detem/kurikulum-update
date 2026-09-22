import type { CountryLight } from "@/lib/types";

const COLORS: Record<CountryLight, string> = {
  green: "bg-emerald-500",
  yellow: "bg-amber-400",
  red: "bg-coral",
};

// Tečka semaforu. Barva se počítá v databázi, sem přichází hotová.
export function StatusDot({
  light,
  label,
  size = 10,
}: {
  light: CountryLight;
  /** Popis pro najetí myší a pro odečítače obrazovky. */
  label: string;
  size?: number;
}) {
  return (
    <span
      title={label}
      aria-label={label}
      role="img"
      className={`inline-block shrink-0 rounded-full ${COLORS[light]}`}
      style={{ width: size, height: size }}
    />
  );
}
