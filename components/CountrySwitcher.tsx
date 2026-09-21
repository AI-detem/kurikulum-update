import Link from "next/link";
import type { Country } from "@/lib/types";

// Přepínač zemí pro adminy. Pro ostatní role dostane prázdný seznam zemí
// a nevykreslí se vůbec.
export function CountrySwitcher({
  countries,
  activeCountryId,
  basePath,
}: {
  countries: Country[];
  activeCountryId: string | null;
  basePath: string;
}) {
  if (countries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {countries.map((country) => (
        <Link
          key={country.id}
          href={`${basePath}?country=${country.id}`}
          className={`badge-pill ${country.id === activeCountryId ? "bg-coral text-white" : ""}`}
        >
          {country.name}
        </Link>
      ))}
    </div>
  );
}
