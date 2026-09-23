"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Logo size={64} showName={false} />
          <span className="font-heading text-2xl font-bold tracking-tight text-ink">
            AI kurikulum
          </span>
        </div>

        {status === "sent" ? (
          <p className="text-center text-sm text-ink/70">
            Poslali jsme ti odkaz na přihlášení na <strong>{email}</strong>. Zkontroluj e-mail
            (i spam).
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <label className="text-sm font-medium text-ink" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jmeno@organizace.cz"
              className="rounded-xl border border-haze px-4 py-2.5 outline-none focus:border-coral"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="mt-2 rounded-xl bg-coral px-4 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {status === "loading" ? "Posílám odkaz..." : "Poslat přihlašovací odkaz"}
            </button>
            {status === "error" && (
              <p className="text-sm text-coral">Něco se nepovedlo, zkus to prosím znovu.</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
