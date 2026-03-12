import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { Navigation } from "@/components/crm/navigation";

export const metadata: Metadata = {
  title: "AionSite Leads CRM",
  description: "Mini CRM interno para AionSite",
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
              <span className="brand-block__eyebrow">AionSite CRM</span>
              <Link href="/overview" className="brand-block__title">
                aionsite.com.mx
              </Link>
              <p>
                Dashboard interno para prospectos, aprobacion comercial y envios.
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
