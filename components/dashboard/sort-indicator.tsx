import type { SortDirection } from "@/lib/table-sort";

type SortIndicatorProps = {
  direction: SortDirection | null;
};

export function SortIndicator({ direction }: SortIndicatorProps) {
  const className = direction
    ? `crm-table__sort-indicator is-${direction}`
    : "crm-table__sort-indicator";

  return (
    <span className={className} aria-hidden="true">
      <svg viewBox="0 0 12 14" focusable="false">
        <path data-arrow="up" d="M6 2 9.5 5.75h-7Z" />
        <path data-arrow="down" d="M6 12 2.5 8.25h7Z" />
      </svg>
    </span>
  );
}
