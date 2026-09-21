import Link from "next/link";
import { requireUser } from "@/lib/current-user";
import { getModulesForCountry } from "@/lib/modules-data";
import { createClient } from "@/lib/supabase/server";
import { ModuleCard } from "@/components/ModuleCard";
import type { Country } from "@/lib/types";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const user = await requireUser();
  const { country } = await searchParams;

  // Admin nemá povinně přiřazenou zemi a může si zemi k prohlížení vybrat.
  // Viewer/editor vidí vždy jen svou vlastní zemi.
  let activeCountryId = user.country_id;
  let countries: Country[] = [];

  if (user.role === "admin") {
    const supabase = await createClient();
    const { data } = await supabase.from("countries").select("*").order("name");
    countries = data ?? [];
    activeCountryId = country ?? user.country_id ?? countries[0]?.id ?? null;
  }

  if (!activeCountryId) {
    return (
      <p className="text-sm text-ink/60">
        Zatím ti není přiřazená žádná země. Ozvi se administrátorovi appky.
      </p>
    );
  }

  const modules = await getModulesForCountry(activeCountryId);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-3xl font-bold text-ink">Metodiky</h1>

        {user.role === "admin" && countries.length > 0 && (
          <div className="flex gap-2">
            {countries.map((c) => (
              <Link
                key={c.id}
                href={`/?country=${c.id}`}
                className={`badge-pill ${
                  c.id === activeCountryId ? "bg-coral text-white" : ""
                }`}
              >
                {c.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {modules.length === 0 ? (
        <p className="text-sm text-ink/50">Zatím tu nejsou žádné moduly.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => (
            <ModuleCard key={module.id} module={module} />
          ))}
        </div>
      )}
    </div>
  );
}
