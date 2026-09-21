// Posílání e-mailových notifikací o nové verzi/změně metodiky přes Resend.
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendChangeNotificationEmail(params: {
  to: string;
  moduleName: string;
  versionNumber: number;
  note: string;
  countryName: string;
}) {
  const { to, moduleName, versionNumber, note, countryName } = params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "AI kurikulum <onboarding@resend.dev>",
    to,
    subject: `Nová verze metodiky: ${moduleName} (${countryName})`,
    text:
      `Modul "${moduleName}" má novou verzi (v${versionNumber}).\n\n` +
      `Co se změnilo:\n${note}\n\n` +
      `Otevřít appku: ${siteUrl}`,
  });
}
