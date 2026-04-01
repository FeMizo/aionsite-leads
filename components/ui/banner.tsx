import type { ReactNode } from "react";

type BannerTone = "default" | "accent";

type BannerProps = {
  title: string;
  description?: string;
  tone?: BannerTone;
  actions?: ReactNode;
  children?: ReactNode;
};

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function Banner({
  title,
  description,
  tone = "accent",
  actions,
  children,
}: BannerProps) {
  return (
    <section className={joinClasses("panel", tone === "accent" && "panel--accent")}>
      <div className="panel__header">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}
