import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { getNotificationsForCurrentUser } from "@/lib/notifications-data";
import { getRequestedCountryId } from "@/lib/request-url";
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

  if (!user) {
    return (
      <html lang="cs">
        <body className="font-sans antialiased">{children}</body>
      </html>
    );
  }

  const { t } = await resolveActiveCountry(user, await getRequestedCountryId());
  const notifications = await getNotificationsForCurrentUser(user.id);

  return (
    <html lang="cs">
      <body className="font-sans antialiased">
        <div className="flex">
          <Sidebar user={user} t={t} />
          <div className="flex-1">
            <header className="flex justify-end border-b border-haze px-8 py-4">
              <NotificationBell initialNotifications={notifications} t={t} />
            </header>
            <main className="px-8 py-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
