type StatusPillProps = {
  status: string;
};

export function StatusPill({ status }: StatusPillProps) {
  const label =
    status === "closed"
      ? "cliente"
      : status === "generated"
      ? "generated"
      : status === "analyzed"
      ? "analyzed"
      : status === "approved"
      ? "approved"
      : status === "ready"
      ? "ready"
      : status === "contacted"
      ? "contacted"
      : status === "rejected"
      ? "rejected"
      : status;

  return <span className={`status-pill status-pill--${status}`}>{label}</span>;
}
