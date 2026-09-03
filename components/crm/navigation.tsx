"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const groups = [
  {
    label: "Espacio de trabajo",
    items: [{ href: "/dashboard", label: "CRM" }],
  },
  {
    label: "Operación",
    items: [{ href: "/dashboard/runs", label: "Búsquedas" }],
  },
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
      {groups.map((group) => (
        <div key={group.label} className="crm-nav__group">
          <span className="crm-nav__group-label">{group.label}</span>
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`crm-nav__link ${isActive(item.href) ? "is-active" : ""}`.trim()}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              <span>{item.label}</span>
              {item.href === "/dashboard/send" ? <span className="crm-nav__shortcut">Prioridad</span> : null}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
