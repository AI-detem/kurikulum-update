import { redirect } from "next/navigation";

// Změny od ostatních zemí se přesunuly na Přehled, samostatnou stránku
// už nemají. Staré odkazy tady nekončí chybou.
export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; module?: string }>;
}) {
  const { country, module } = await searchParams;
  const params = new URLSearchParams();
  if (country) params.set("country", country);
  if (module) params.set("module", module);

  const query = params.toString();
  redirect(query ? `/?${query}` : "/");
}
