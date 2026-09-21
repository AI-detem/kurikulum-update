// Po zapsání změny vytvoří in-app notifikaci pro všechny uživatele dané
// země a pošle jim e-mail. Voláno ze server akce po nahrání nové verze
// (viz app/admin/upload/actions.ts).
import { createAdminClient } from "@/lib/supabase/server";
import { sendChangeNotificationEmail } from "@/lib/resend";

export async function notifyCountryAboutChange(params: {
  changeId: string;
  countryId: string;
  countryName: string;
  moduleName: string;
  versionNumber: number;
  /** Celkové shrnutí, pokud ho editor napsal. */
  summary: string;
  /** Popisy jednotlivých označených míst v pořadí čtení. */
  notes: string[];
}) {
  const { changeId, countryId, countryName, moduleName, versionNumber, summary, notes } = params;
  const supabase = createAdminClient();

  // Všichni uživatelé (viewer i editor/admin) z dané země dostanou notifikaci.
  const { data: recipients, error } = await supabase
    .from("users")
    .select("id, email")
    .eq("country_id", countryId);

  if (error || !recipients) {
    console.error("Nepodařilo se načíst příjemce notifikace:", error);
    return;
  }

  for (const recipient of recipients) {
    const { data: notification } = await supabase
      .from("notifications")
      .insert({ user_id: recipient.id, change_id: changeId })
      .select()
      .single();

    try {
      await sendChangeNotificationEmail({
        to: recipient.email,
        moduleName,
        versionNumber,
        summary,
        notes,
        countryName,
      });

      if (notification) {
        await supabase
          .from("notifications")
          .update({ email_sent_at: new Date().toISOString() })
          .eq("id", notification.id);
      }
    } catch (emailError) {
      // Notifikace v appce zůstane vytvořená, i když se e-mail nepodaří poslat.
      console.error(`Nepodařilo se poslat e-mail na ${recipient.email}:`, emailError);
    }
  }
}
