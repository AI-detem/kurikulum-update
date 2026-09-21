// Posílání e-mailových notifikací o nové verzi/změně metodiky přes Resend.
import { Resend } from "resend";

export async function sendChangeNotificationEmail(params: {
  to: string;
  moduleName: string;
  versionNumber: number;
  uploadedAt: string;
  summary: string;
  notes: string[];
  countryName: string;
}) {
  const { to, moduleName, versionNumber, uploadedAt, summary, notes, countryName } = params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  // Klient se vytváří až tady (ne při načtení souboru), aby appka šla
  // sestavit, i než je RESEND_API_KEY nastavený (např. při prvním nasazení).
  const resend = new Resend(process.env.RESEND_API_KEY);

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "AI kurikulum <onboarding@resend.dev>",
    to,
    subject: `Nová verze metodiky: ${moduleName} (${countryName})`,
    text:
      `Modul "${moduleName}" má novou verzi (v${versionNumber}, ${formatUtc(uploadedAt)}).\n\n` +
      (summary ? `Co se změnilo:\n${summary}\n\n` : "") +
      (notes.length
        ? `Označená místa v dokumentu:\n${notes
            .map((note, index) => `${index + 1}. ${note}`)
            .join("\n")}\n\n`
        : "") +
      `Otevřít appku: ${siteUrl}`,
  });
}

// Autorovi předchozí verze dáme vědět, že na ni někdo navázal.
export async function sendNewerVersionEmail(params: {
  to: string;
  moduleName: string;
  theirVersion: number;
  newVersion: number;
}) {
  const { to, moduleName, theirVersion, newVersion } = params;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const resend = new Resend(process.env.RESEND_API_KEY);

  return resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "AI kurikulum <onboarding@resend.dev>",
    to,
    subject: `K tvé verzi metodiky přibyla novější: ${moduleName}`,
    text:
      `K tvé verzi v${theirVersion} modulu "${moduleName}" přibyla novější verze v${newVersion}.\n\n` +
      `Otevřít appku: ${siteUrl}`,
  });
}

// V e-mailu neznáme časové pásmo příjemce, proto čas píšeme v UTC.
function formatUtc(value: string): string {
  return new Date(value).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }) + " UTC";
}
