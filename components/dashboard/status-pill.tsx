import { getProspectStatusLabel } from "@/lib/prospect-status";

type StatusPillProps = {
  status: string;
};

const STATUS_ICON_PATHS: Record<string, string> = {
  generated: "M12 3v4m0 10v4m9-9h-4M7 12H3m15.36-6.36-2.83 2.83M8.47 15.53l-2.83 2.83m0-12.72 2.83 2.83m5.66 5.66 2.83 2.83",
  analyzed: "M4 19V5m0 14h16M7 15l3-4 3 2 4-6",
  approved: "m5 12 4 4L19 6",
  ready: "m4 12 16-8-5 16-3-7-8-1Z",
  scheduled: "M12 7v5l3 2M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  contacted: "M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H12l-4 3v-3H6.5A2.5 2.5 0 0 1 4 13.5v-7Z",
  second_attempt: "M20 11a8 8 0 0 0-14.9-4M4 5v4h4M4 13a8 8 0 0 0 14.9 4M20 19v-4h-4",
  followup: "M12 7v5l3 2M19 12a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
  replied: "M5 5h14v10H9l-4 4V5Zm4 5h6",
  closed: "m5 12 4 4L19 6",
  rejected: "m7 7 10 10M17 7 7 17",
  uncontactable: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm-5.5 15.5 11-13",
};

export function StatusIcon({ status }: StatusPillProps) {
  return (
    <svg className="status-pill__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={STATUS_ICON_PATHS[status] || STATUS_ICON_PATHS.generated} />
    </svg>
  );
}

export function StatusPill({ status }: StatusPillProps) {
  const label = getProspectStatusLabel(status);

  return (
    <span className={`status-pill status-pill--${status}`}>
      <StatusIcon status={status} />
      {label}
    </span>
  );
}
