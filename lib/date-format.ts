const DASHBOARD_LOCALE = "es-MX";
const DASHBOARD_TIMEZONE = "America/Mexico_City";

export function formatDashboardDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);

  return new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DASHBOARD_TIMEZONE,
  }).format(date);
}
