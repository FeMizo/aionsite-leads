"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Resumen" },
  { href: "/dashboard/generated", label: "Generados" },
  { href: "/dashboard/prospects", label: "Prospectos" },
  { href: "/dashboard/send", label: "Enviar" },
  { href: "/dashboard/scheduled", label: "Programados" },
  { href: "/dashboard/contacted", label: "Contactados" },
  { href: "/dashboard/replied", label: "Respondidos" },
  { href: "/dashboard/followup", label: "Seguimiento" },
  { href: "/dashboard/uncontactable", label: "Sin contactar" },
  { href: "/dashboard/runs", label: "Busquedas" },
];

export function Navigation() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav className="crm-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`crm-nav__link ${isActive(item.href) ? "is-active" : ""}`.trim()}
          aria-current={isActive(item.href) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
