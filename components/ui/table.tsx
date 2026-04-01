import type { ReactNode } from "react";
import { Section } from "@/components/ui/section";

type TableProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  emptyState?: ReactNode;
  hasRows: boolean;
  children: ReactNode;
};

export function Table({
  title,
  description,
  actions,
  emptyState,
  hasRows,
  children,
}: TableProps) {
  return (
    <Section title={title} description={description} actions={actions}>
      {hasRows ? <div className="crm-table-wrap">{children}</div> : emptyState}
    </Section>
  );
}
