import Link from "next/link";
import type { ReactNode } from "react";

type CardProps = {
  label?: string;
  value?: ReactNode;
  meta?: ReactNode;
  href?: string;
  className?: string;
  children?: ReactNode;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function CardContent({ label, value, meta, children }: Omit<CardProps, "href" | "className">) {
  if (children) {
    return <>{children}</>;
  }

  return (
    <>
      {label ? <span className="crm-card__label">{label}</span> : null}
      {value !== undefined ? <strong className="crm-card__value">{value}</strong> : null}
      {meta !== undefined ? <span className="crm-card__meta">{meta}</span> : null}
    </>
  );
}

export function Card({ href, className, ...props }: CardProps) {
  const classes = joinClasses("crm-card", href && "crm-card--link", className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        <CardContent {...props} />
      </Link>
    );
  }

  return (
    <article className={classes}>
      <CardContent {...props} />
    </article>
  );
}
