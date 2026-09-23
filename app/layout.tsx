import type { Metadata } from "next";
import "./globals.css";
import { getCurrentUser } from "@/lib/current-user";
import { resolveActiveCountry } from "@/lib/active-country";
import { getNotificationsForCurrentUser } from "@/lib/notifications-data";
import { Sidebar } from "@/components/Sidebar";
import { NotificationBell } from "@/components/NotificationBell";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const TITLE = "AI kurikulum";
const DESCRIPTION = "Sdílení metodik AI kurikula s partnerskými zeměmi";

export const metadata: Metadata = {
  // metadataBase je potřeba, aby se relativní cesta k náhledu doplnila
  // na úplnou adresu – sociální sítě si relativní odkaz nepřeloží.
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: TITLE,
    locale: "cs_CZ",
    type: "website",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "AI dětem" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
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

  // Zemi si resolveActiveCountry přečte z cookie – layout parametry
  // z adresy nedostává.
  const { t } = await resolveActiveCountry(user);
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
