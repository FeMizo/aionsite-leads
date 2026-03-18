"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Resumen" },
  { href: "/dashboard/generated", label: "Generated" },
  { href: "/dashboard/prospects", label: "Prospects" },
  { href: "/dashboard/send", label: "Envios" },
  { href: "/dashboard/contacted", label: "Contactados" },
  { href: "/dashboard/runs", label: "Corridas" },
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
