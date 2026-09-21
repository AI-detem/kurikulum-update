import { Bot } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coral text-white">
        <Bot size={20} strokeWidth={2} />
      </span>
      <span className="font-heading text-xl font-bold tracking-tight text-ink">
        AI kurikulum
      </span>
    </div>
  );
}
