import { notFound } from "next/navigation";
import { requireUser } from "@/lib/current-user";
import { getModuleDetail } from "@/lib/modules-data";
import { VersionHistory } from "@/components/VersionHistory";

export default async function ModuleDetailPage({
  params,
}: {
  params: Promise<{ moduleId: string }>;
}) {
  const user = await requireUser();
  const { moduleId } = await params;

  if (!user.country_id) {
    return <p className="text-sm text-ink/60">Zatím ti není přiřazená žádná země.</p>;
  }

  const { module, versions } = await getModuleDetail(moduleId, user.country_id);

  if (!module) notFound();

  return (
    <div className="max-w-2xl">
      <p className="badge-pill mb-3">{module.category ?? "Bez kategorie"}</p>
      <h1 className="mb-6 font-heading text-3xl font-bold text-ink">{module.name}</h1>
      <VersionHistory versions={versions} />
    </div>
  );
}
