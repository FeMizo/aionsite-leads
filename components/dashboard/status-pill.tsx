import { getProspectStatusLabel } from "@/lib/prospect-status";

type StatusPillProps = {
  status: string;
};

export function StatusPill({ status }: StatusPillProps) {
  const label = getProspectStatusLabel(status);

  return <span className={`status-pill status-pill--${status}`}>{label}</span>;
}
