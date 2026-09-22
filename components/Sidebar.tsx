import Link from "next/link";
import { LayoutGrid, UploadCloud, Settings, LogOut, Inbox } from "lucide-react";
import { fill } from "@/lib/format";
import { Logo } from "@/components/Logo";
import type { AppUser } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n";

export function Sidebar({
  user,
  pendingCount,
  t,
}: {
  user: AppUser;
  /** Kolik změn od ostatních zemí čeká na reakci. */
  pendingCount: number;
  t: Dictionary;
}) {
  const canManage = user.role === "admin" || user.role === "editor";

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-haze bg-white px-4 py-6">
      <div className="mb-8 px-2">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <SidebarLink href="/" icon={<LayoutGrid size={18} />} label={t.overview} />
        <SidebarLink
          href="/changes"
          icon={<Inbox size={18} />}
          label={t.changesFromOthers}
          badge={pendingCount}
          badgeTitle={fill(t.pendingTitle, { count: pendingCount })}
        />
        {canManage && (
          <SidebarLink
            href="/admin/upload"
            icon={<UploadCloud size={18} />}
            label={t.upload}
          />
        )}
        {user.role === "admin" && (
          <SidebarLink href="/admin" icon={<Settings size={18} />} label={t.admin} />
        )}
      </nav>

      <div className="dashed-divider mt-4 pt-4">
        <p className="px-2 text-xs text-ink/60">{user.email}</p>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink/70 hover:bg-haze"
          >
            <LogOut size={16} />
            {t.logout}
          </button>
        </form>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  badge,
  badgeTitle,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  /** Počet v korálovém kolečku vpravo. Nula se nezobrazuje. */
  badge?: number;
  badgeTitle?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-haze"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge ? (
        <span
          title={badgeTitle}
          className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[11px] font-semibold text-white"
        >
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
