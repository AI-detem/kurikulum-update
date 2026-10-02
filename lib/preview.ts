// Náhled "jako editor" pro admina.
//
// Admin si může appku prohlédnout očima editora jedné země – uvidí přesně
// to, co uvidí partner ze Slovenska. Je to zúžení, ne rozšíření: v náhledu
// se ztrácí administrace i pohled přes všechny země a zápisy se chovají
// jako u editora té země.
import { cookies } from "next/headers";

export const PREVIEW_COOKIE = "previewAsEditor";

export async function readPreviewCountry(): Promise<string | null> {
  const value = (await cookies()).get(PREVIEW_COOKIE)?.value;
  return value && value.length > 0 ? value : null;
}
