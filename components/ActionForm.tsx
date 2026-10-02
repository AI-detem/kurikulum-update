"use client";

import { useActionState, type ReactNode } from "react";
import type { ActionState } from "@/app/admin/actions";

// Formulář se serverovou akcí, která chybu vrací místo toho, aby spadla.
// Výjimka ze serverové akce skončí bílou stránkou "Application error",
// na které se uživatel nedozví nic – tohle ji ukáže přímo u formuláře.
export function ActionForm({
  action,
  className,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  className?: string;
  children: ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);

  return (
    <div>
      <form action={formAction} className={className}>
        {children}
      </form>

      {state && "error" in state && (
        <p className="mt-2 text-sm text-coral">{state.error}</p>
      )}
      {state && "ok" in state && <p className="mt-2 text-sm text-ink/60">{state.ok}</p>}
    </div>
  );
}
