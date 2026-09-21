// Načtení notifikací aktuálního uživatele včetně textu změny a názvu modulu,
// aby se dal zvoneček s notifikacemi vykreslit jedním dotazem.
import { createClient } from "@/lib/supabase/server";

export type NotificationWithDetails = {
  id: string;
  read_at: string | null;
  created_at: string;
  note: string;
  category: string | null;
  module_name: string;
  version_number: number;
};

export async function getNotificationsForCurrentUser(
  userId: string
): Promise<NotificationWithDetails[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `
      id,
      read_at,
      changes (
        note,
        category,
        created_at,
        document_versions ( version_number, modules ( name ) )
      )
    `
    )
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map((n) => {
    // Supabase vrací vnořené vztahy jako pole nebo objekt podle typu vazby;
    // pro jistotu obojí ošetříme.
    const change = Array.isArray(n.changes) ? n.changes[0] : n.changes;
    const version = Array.isArray(change?.document_versions)
      ? change?.document_versions[0]
      : change?.document_versions;
    const moduleData = Array.isArray(version?.modules) ? version?.modules[0] : version?.modules;

    return {
      id: n.id,
      read_at: n.read_at,
      created_at: change?.created_at ?? "",
      note: change?.note ?? "",
      category: change?.category ?? null,
      module_name: moduleData?.name ?? "Neznámý modul",
      version_number: version?.version_number ?? 0,
    };
  });
}
