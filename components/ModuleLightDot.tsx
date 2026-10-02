import Link from "next/link";
import { StatusDot } from "@/components/StatusDot";
import type { CountryLight } from "@/lib/types";

// Tečka semaforu na kartě metodiky. Když je co řešit, vede na Přehled
// a rovnou na tu změnu – karty metodik a seznam změn dnes bydlí každý
// na své stránce, odrolovat na místě tedy není kam.
export function ModuleLightDot({
  moduleId,
  countryId,
  light,
  label,
}: {
  moduleId: string;
  countryId: string;
  light: CountryLight;
  label: string;
}) {
  // U zelené a šedé není kam vést, tečka je jen informace.
  if (light === "green" || light === "none") {
    return <StatusDot light={light} label={label} size={10} />;
  }

  return (
    <Link
      href={`/?country=${countryId}&module=${moduleId}`}
      title={label}
      className="flex rounded-full p-1 hover:bg-haze"
    >
      <StatusDot light={light} label={label} size={10} />
    </Link>
  );
}
