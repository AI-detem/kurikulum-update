import { redirect } from "next/navigation";
import { requireUser, canUpload } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "@/components/UploadForm";

export default async function UploadPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const user = await requireUser();
  if (!canUpload(user)) redirect("/");

  const { country } = await searchParams;
  const { activeCountryId, t } = await resolveActiveCountry(user, country);

  const supabase = await createClient();
  const { data: modules } = await supabase.from("modules").select("*").order("name");
  const { data: countries } = await supabase.from("countries").select("*").order("name");

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-heading text-3xl font-bold text-ink">{t.uploadNewVersion}</h1>

      <UploadForm
        modules={modules ?? []}
        countries={countries ?? []}
        defaultCountryId={user.role === "admin" ? activeCountryId : user.country_id}
        canChooseCountry={user.role === "admin"}
        t={t}
      />
    </div>
  );
}
