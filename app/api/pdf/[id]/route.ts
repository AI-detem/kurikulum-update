// Serverová proxy k PDF na Google Drive.
//
// Appka si soubor stáhne na serveru a pošle ho prohlížeči ze své vlastní
// adresy. Díky tomu ho umí vykreslit vlastní prohlížeč PDF (bez šedého
// pozadí a lišty Googlu) a zároveň odpadá problém s CORS.
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { drivePreviewUrl } from "@/lib/drive";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Nepřihlášený uživatel", { status: 401 });
  }

  // Soubor pošleme jen tehdy, když k němu v databázi existuje verze, kterou
  // uživatel smí vidět – o to se starají pravidla Row Level Security.
  // Jinak by šlo přes appku stahovat libovolný soubor z Drive.
  const { data: version } = await supabase
    .from("document_versions")
    .select("id")
    .eq("file_url", drivePreviewUrl(id))
    .limit(1)
    .maybeSingle();

  if (!version) {
    return new NextResponse("Dokument nenalezen", { status: 404 });
  }

  const driveResponse = await fetch(
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download`
  );

  if (!driveResponse.ok || !driveResponse.body) {
    return new NextResponse("Soubor se nepodařilo načíst z Google Drive", {
      status: 502,
    });
  }

  // Když soubor není sdílený veřejně, Drive místo PDF vrátí HTML stránku
  // s přihlášením. Poznáme to podle typu obsahu.
  const contentType = driveResponse.headers.get("content-type") ?? "";
  if (!contentType.includes("application/pdf")) {
    return new NextResponse(
      "Soubor v Google Drive není sdílený pro kohokoli s odkazem",
      { status: 502 }
    );
  }

  return new NextResponse(driveResponse.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, max-age=300",
    },
  });
}
