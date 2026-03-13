import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { Navigation } from "@/components/crm/navigation";

export const metadata: Metadata = {
  title: "AionSite Prospecting Dashboard",
  description: "Prospecting dashboard con Vercel Functions y Postgres",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <div className="app-shell">
          <aside className="app-sidebar">
            <div className="brand-block">
              <span className="brand-block__eyebrow">AionSite Prospecting</span>
              <Link href="/dashboard" className="brand-block__title">
                aionsite.com.mx
              </Link>
              <p>
                Dashboard operativo para prospecting, corridas programadas y envios SMTP.
              </p>
            </div>
            <Navigation />
          </aside>
          <main className="app-main">{children}</main>
        </div>
      </body>
    </html>
  );
}
