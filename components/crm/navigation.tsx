"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AppIcon, type AppIconName } from "@/components/crm/app-icon";

type NavLink = { href: string; label: string; icon: AppIconName };

const groups: Array<{ label: string; items: NavLink[] }> = [
  {
    label: "Espacio de trabajo",
    items: [
      { href: "/dashboard", label: "Inicio", icon: "home" },
    ],
  },
  {
    label: "Operación",
    items: [
      { href: "/dashboard/runs", label: "Búsquedas", icon: "search" as const },
      { href: "/dashboard/analytics", label: "Analítica", icon: "chart" as const },
    ],
  },
];

const prospectLinks: NavLink[] = [
  { href: "/dashboard/crm", label: "Todos los prospectos", icon: "users" },
  { href: "/dashboard/generated", label: "Generados", icon: "search" },
  { href: "/dashboard/prospects", label: "Aprobados", icon: "chart" },
  { href: "/dashboard/send", label: "Listos para enviar", icon: "briefcase" },
  { href: "/dashboard/contacted", label: "Contactados", icon: "users" },
  { href: "/dashboard/followup", label: "Seguimiento", icon: "search" },
];

const jobLinks: NavLink[] = [
  { href: "/dashboard/jobs", label: "Todos los jobs", icon: "briefcase" },
  { href: "/dashboard/jobs?status=pendiente", label: "Pendientes", icon: "search" },
  { href: "/dashboard/jobs?status=para_aplicar", label: "Por aplicar", icon: "chart" },
  { href: "/dashboard/jobs?status=aplicado", label: "Aplicados", icon: "users" },
  { href: "/dashboard/jobs?status=skipeado", label: "Skipeados", icon: "search" },
  { href: "/dashboard/jobs?status=no_entra_en_planes", label: "No entra en planes", icon: "chart" },
  { href: "/dashboard/jobs?status=no_disponible", label: "No disponibles", icon: "search" },
  { href: "/dashboard/jobs?status=follow_up", label: "Follow-up", icon: "users" },
  { href: "/dashboard/jobs?status=en_espera", label: "En espera", icon: "chart" },
  { href: "/dashboard/jobs?status=rechazado", label: "Rechazados", icon: "search" },
  { href: "/dashboard/jobs?status=bloqueado", label: "Bloqueados", icon: "chart" },
  { href: "/dashboard/jobs?status=guardado_para_despues", label: "Guardados", icon: "briefcase" },
];

export function Navigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prospectActive = prospectLinks.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const jobsActive = pathname === "/dashboard/jobs" || pathname.startsWith("/dashboard/jobs/");
  const [prospectsOpen, setProspectsOpen] = useState(prospectActive);
  const [jobsOpen, setJobsOpen] = useState(jobsActive);

  useEffect(() => {
    if (prospectActive) setProspectsOpen(true);
    if (jobsActive) setJobsOpen(true);
  }, [jobsActive, prospectActive]);

  function isActive(href: string) {
    const target = new URL(href, "http://localhost");
    const pathMatches = target.pathname === "/dashboard"
      ? pathname === target.pathname
      : pathname === target.pathname || pathname.startsWith(`${target.pathname}/`);

    if (!pathMatches) {
      return false;
    }

    const targetStatus = target.searchParams.get("status");
    if (targetStatus) {
      return searchParams.get("status") === targetStatus;
    }

    if (target.pathname === "/dashboard/jobs" && searchParams.has("status")) {
      return false;
    }

    return true;
  }

  return (
    <nav className="crm-nav">
      <div className="crm-nav__group">
        <span className="crm-nav__group-label">Espacio de trabajo</span>
        <Link href="/dashboard" className={`crm-nav__link ${isActive("/dashboard") ? "is-active" : ""}`.trim()} aria-current={isActive("/dashboard") ? "page" : undefined}>
          <span className="crm-nav__label"><AppIcon name="home" />Inicio</span>
        </Link>
        <CollapsibleNav label="Prospectos" icon="users" links={prospectLinks} open={prospectsOpen} onToggle={() => setProspectsOpen((value) => !value)} isActive={prospectActive} isLinkActive={isActive} />
        <CollapsibleNav label="Jobs" icon="briefcase" links={jobLinks} open={jobsOpen} onToggle={() => setJobsOpen((value) => !value)} isActive={jobsActive} isLinkActive={isActive} />
      </div>
      <div className="crm-nav__group">
        <span className="crm-nav__group-label">Operación</span>
        {groups[1].items.map((item) => (
          <Link key={item.href} href={item.href} className={`crm-nav__link ${isActive(item.href) ? "is-active" : ""}`.trim()} aria-current={isActive(item.href) ? "page" : undefined}>
            <span className="crm-nav__label"><AppIcon name={item.icon} />{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

function CollapsibleNav({
  label,
  icon,
  links,
  open,
  onToggle,
  isActive,
  isLinkActive,
}: {
  label: string;
  icon: AppIconName;
  links: NavLink[];
  open: boolean;
  onToggle: () => void;
  isActive: boolean;
  isLinkActive: (href: string) => boolean;
}) {
  return (
    <div className="crm-nav__collapsible">
      <div className={`crm-nav__parent ${isActive ? "is-active" : ""}`.trim()}>
        <Link href={links[0].href} className="crm-nav__parent-link">
          <span className="crm-nav__label"><AppIcon name={icon} />{label}</span>
        </Link>
        <button type="button" className="crm-nav__toggle" onClick={onToggle} aria-expanded={open} aria-label={`${open ? "Cerrar" : "Abrir"} menú de ${label}`}>
          <span aria-hidden="true">{open ? "⌃" : "⌄"}</span>
        </button>
      </div>
      {open ? (
        <div className="crm-nav__subnav">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className={`crm-nav__sublink ${isLinkActive(item.href) ? "is-active" : ""}`.trim()} aria-current={isLinkActive(item.href) ? "page" : undefined}>
              <AppIcon name={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
