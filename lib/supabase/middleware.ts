// Pomocná funkce pro middleware.ts – obnovuje přihlašovací session při každém
// požadavku, aby uživatel nebyl náhodou odhlášen, i když je token starší.
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { URL_HEADER } from "@/lib/request-url";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Adresu požadavku posíláme dál jako hlavičku, aby si z ní layout mohl
// přečíst vybranou zemi (viz lib/request-url.ts).
function nextWithUrlHeader(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set(URL_HEADER, request.url);
  return NextResponse.next({ request: { headers } });
}

export async function updateSession(request: NextRequest) {
  let response = nextWithUrlHeader(request);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = nextWithUrlHeader(request);
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isAuthCallback = request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isLoginPage && !isAuthCallback) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
