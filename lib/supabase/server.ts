// Supabase klient pro použití na serveru (server komponenty, server akce, route handlery).
// Čte a zapisuje přihlašovací cookie uživatele, takže RLS pravidla v databázi
// vidí, kdo je přihlášený.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll se volá i ze Server komponent, kde nejde zapisovat cookie.
            // To je v pořádku, pokud middleware.ts obnovuje session zvlášť.
          }
        },
      },
    }
  );
}

// Klient s "service role" klíčem, který obchází RLS pravidla.
// Používat POUZE na serveru pro administrativní operace (např. pozvání uživatele).
// Nikdy tenhle klíč neposílat do prohlížeče.
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
