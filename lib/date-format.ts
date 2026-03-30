import { getProspectTimeZone } from "@/lib/prospect-timezone";

const DASHBOARD_LOCALE = "es-MX";

export function formatDashboardDateTime(
  value: string | Date,
  options: { city?: string; timeZone?: string } = {}
) {
  const date = value instanceof Date ? value : new Date(value);
  const timeZone = options.timeZone || getProspectTimeZone(options.city);

  return new Intl.DateTimeFormat(DASHBOARD_LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}
