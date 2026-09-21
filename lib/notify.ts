// Po zapsání změny vytvoří in-app notifikaci pro všechny uživatele dané
// země a pošle jim e-mail. Voláno ze server akce po nahrání nové verze
// (viz app/admin/upload/actions.ts).
import { createAdminClient } from "@/lib/supabase/server";
import { sendChangeNotificationEmail, sendNewerVersionEmail } from "@/lib/resend";

export async function notifyCountryAboutChange(params: {
  changeId: string;
  countryId: string;
  countryName: string;
  moduleName: string;
  versionNumber: number;
  uploadedAt: string;
  /** Celkové shrnutí, pokud ho editor napsal. */
  summary: string;
  /** Popisy jednotlivých označených míst v pořadí čtení. */
  notes: string[];
}) {
  const { changeId, countryId, countryName, moduleName, versionNumber, uploadedAt, summary, notes } = params;
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
        uploadedAt,
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

// Autor předchozí verze se dozví, že k ní přibyla novější.
export async function notifyPreviousAuthor(params: {
  changeId: string;
  authorId: string;
  moduleName: string;
  theirVersion: number;
  newVersion: number;
}) {
  const { changeId, authorId, moduleName, theirVersion, newVersion } = params;
  const supabase = createAdminClient();

  const { data: author } = await supabase
    .from("users")
    .select("email")
    .eq("id", authorId)
    .maybeSingle();

  if (!author?.email) return;

  // Notifikaci v appce už mohl dostat jako člen země – pak ji nezdvojujeme.
  const { data: existing } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", authorId)
    .eq("change_id", changeId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("notifications").insert({ user_id: authorId, change_id: changeId });
  }

  try {
    await sendNewerVersionEmail({
      to: author.email,
      moduleName,
      theirVersion,
      newVersion,
    });
  } catch (emailError) {
    console.error(`Nepodařilo se upozornit autora ${author.email}:`, emailError);
  }
}
