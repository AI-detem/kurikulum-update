import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/current-user";
import { getNotificationsForCurrentUser } from "@/lib/notifications-data";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";

export const metadata: Metadata = {
  title: "AI kurikulum",
  description: "Sdílení metodik AI kurikula s partnerskými zeměmi",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="cs">
      <body className="font-sans antialiased">
        {user ? (
          <div className="flex">
            <Sidebar user={user} />
            <div className="flex-1">
              <header className="flex justify-end border-b border-haze px-8 py-4">
                <NotificationBell
                  initialNotifications={await getNotificationsForCurrentUser(user.id)}
                />
              </header>
              <main className="px-8 py-8">{children}</main>
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
