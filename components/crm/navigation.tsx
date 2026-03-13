"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "Dashboard" },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="crm-nav">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`crm-nav__link ${pathname === item.href ? "is-active" : ""}`.trim()}
          aria-current={pathname === item.href ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
