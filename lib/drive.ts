// PDF metodik neukládáme u sebe – leží na Google Drive a v databázi
// máme jen odkaz na ně.

// ID souboru na Drive je dlouhý řetězec písmen, číslic, pomlček a podtržítek.
const FILE_ID = /^[A-Za-z0-9_-]{10,}$/;

// Z vloženého odkazu vytáhne ID souboru. Zvládne běžné tvary:
//   https://drive.google.com/file/d/ID/view?usp=sharing
//   https://drive.google.com/open?id=ID
//   samotné ID
// Když odkaz neodpovídá ničemu z toho, vrátí null.
export function extractDriveFileId(input: string): string | null {
  const value = input.trim();
  if (!value) return null;

  const fromPath = value.match(/\/d\/([A-Za-z0-9_-]+)/);
  if (fromPath) return fromPath[1];

  const fromQuery = value.match(/[?&]id=([A-Za-z0-9_-]+)/);
  if (fromQuery) return fromQuery[1];

  return FILE_ID.test(value) ? value : null;
}

// Adresa pro vložený náhled ve stránce – tuhle podobu ukládáme do databáze.
export function drivePreviewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

const PREVIEW_URL = /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]+\/preview(\?.*)?$/;

// Odpovídá uložený odkaz tvaru, který umíme vložit do stránky?
// Nic se neověřuje po síti – dostupnost souboru se z prohlížeče zjistit nedá
// (Google to kvůli CORS nedovolí) a neúspěšný dotaz by nic nedokazoval.
export function isDrivePreviewUrl(url: string): boolean {
  return PREVIEW_URL.test(url);
}

// Adresa stránky souboru na Drive, kde má člověk vlastní tlačítko stažení.
export function driveViewUrl(previewUrl: string): string {
  return previewUrl.replace(/\/preview$/, "/view");
}

// Content-Disposition má dva tvary: filename="..." a filename*=UTF-8''...
// Ten druhý unese diakritiku, proto má přednost.
export function fileNameFromDisposition(value: string | null): string | null {
  if (!value) return null;

  const utf8 = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]).trim() || null;
    } catch {
      // Vadné kódování není důvod rozpoznávání shodit, zkusíme prostý tvar.
    }
  }

  const prosty = value.match(/filename="([^"]+)"/i) ?? value.match(/filename=([^;]+)/i);
  return prosty ? prosty[1].trim() || null : null;
}
