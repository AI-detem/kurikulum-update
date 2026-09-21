// Layout (levý panel) se vykresluje bez parametrů z adresy – Next.js je
// posílá jen stránkám. Aby layout věděl, jakou zemi si admin právě prohlíží,
// middleware mu adresu přidá jako hlavičku požadavku a tady ji přečteme.
import { headers } from "next/headers";

export const URL_HEADER = "x-url";

export async function getRequestedCountryId(): Promise<string | undefined> {
  const url = (await headers()).get(URL_HEADER);
  if (!url) return undefined;
  return new URL(url).searchParams.get("country") ?? undefined;
}
