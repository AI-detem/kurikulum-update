import Link from "next/link";
import { LayoutGrid, UploadCloud, Settings, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import type { AppUser } from "@/lib/types";

export function Sidebar({ user }: { user: AppUser }) {
  const canManage = user.role === "admin" || user.role === "editor";

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-haze bg-white px-4 py-6">
      <div className="mb-8 px-2">
        <Logo />
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <SidebarLink href="/" icon={<LayoutGrid size={18} />} label="Přehled" />
        {canManage && (
          <SidebarLink
            href="/admin/upload"
            icon={<UploadCloud size={18} />}
            label="Nahrát novou verzi"
          />
        )}
        {user.role === "admin" && (
          <SidebarLink href="/admin" icon={<Settings size={18} />} label="Administrace" />
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
            Odhlásit se
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
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-haze"
    >
      {icon}
      {label}
    </Link>
  );
}
