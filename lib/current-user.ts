// Pomocná funkce pro server komponenty: vrátí přihlášeného uživatele
// spolu s jeho rolí a zemí (z tabulky public.users), ne jen auth údaje.
import { createClient } from "@/lib/supabase/server";
import type { AppUser } from "@/lib/types";
import { redirect } from "next/navigation";

export async function getCurrentUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: appUser } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .single();

  return appUser as AppUser | null;
}

// Použij na stránkách, které vyžadují přihlášení. Pokud uživatel není
// přihlášený, přesměruje na /login.
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

// Použij na stránkách jen pro adminy (např. /admin).
export async function requireAdmin(): Promise<AppUser> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}

// Nahrávat nové verze dokumentů může admin i editor.
export function canUpload(user: AppUser): boolean {
  return user.role === "admin" || user.role === "editor";
}
