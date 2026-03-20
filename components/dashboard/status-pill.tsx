type StatusPillProps = {
  status: string;
};

export function StatusPill({ status }: StatusPillProps) {
  const label =
    status === "closed"
      ? "cliente"
      : status === "generated"
      ? "generated"
      : status === "prospect"
      ? "prospect"
      : status === "contacted"
      ? "contacted"
      : status === "failed"
      ? "failed"
      : status === "rejected"
      ? "rejected"
      : status;

  return <span className={`status-pill status-pill--${status}`}>{label}</span>;
}
