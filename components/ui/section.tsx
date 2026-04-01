import type { ReactNode } from "react";

type SectionProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Section({
  title,
  description,
  actions,
  className,
  children,
}: SectionProps) {
  return (
    <section className={joinClasses("panel", className)}>
      {title || description || actions ? (
        <div className="panel__header">
          <div>
            {title ? <h2>{title}</h2> : null}
            {description ? <p>{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}
