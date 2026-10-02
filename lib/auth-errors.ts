// Rozpoznání chyb z přihlašování a pozvánek.
//
// Supabase posílá e-maily přes vestavěnou poštu, která má přísný limit
// (ve výchozím nastavení pár zpráv za hodinu). Uživateli se to musí
// říct srozumitelně, jinak zkouší znovu a znovu a limit tím jen drží.

type AuthLikeError = { message?: string; status?: number; code?: string } | null | undefined;

export function isRateLimit(error: AuthLikeError): boolean {
  if (!error) return false;
  if (error.status === 429) return true;

  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return text.includes("rate limit") || text.includes("over_email_send_rate_limit");
}
