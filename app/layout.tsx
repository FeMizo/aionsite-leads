import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { Navigation } from "@/components/crm/navigation";

export const metadata: Metadata = {
  title: {
    default: "AionSite Prospecting",
    template: "%s · AionSite",
  },
  description:
    "Dashboard operativo de prospecting para AionSite — busquedas automatizadas, gestion de prospectos y envios SMTP desde Vercel.",
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
                Dashboard operativo para prospecting, busquedas programadas y envios SMTP.
              </p>
            </div>
            <Navigation />
          </aside>
          <main className="app-main">
            <div className="app-topbar">
              <div>
                <span className="app-topbar__eyebrow">Espacio de trabajo</span>
                <strong>AionSite CRM</strong>
              </div>
              <div className="app-topbar__status">
                <span className="app-topbar__status-dot" aria-hidden="true" />
                Operación activa
              </div>
            </div>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
