import { createMexicoCityDate, getMexicoCityTimeParts } from "@/lib/mexico-city-time";

export const PROSPECTING_CRON = "0 15 */2 * *";

export function getNextProspectingCrawlAt(referenceDate = new Date()) {
  const referenceParts = getMexicoCityTimeParts(referenceDate);

  for (let offsetDays = 0; offsetDays < 62; offsetDays += 1) {
    const candidate = createMexicoCityDate({
      year: referenceParts.year,
      month: referenceParts.month,
      day: referenceParts.day + offsetDays,
      hour: 9,
      minute: 0,
      second: 0,
    });
    const candidateParts = getMexicoCityTimeParts(candidate);

    if (candidate <= referenceDate) {
      continue;
    }

    if (candidateParts.day % 2 === 1) {
      return candidate.toISOString();
    }
  }

  throw new Error("No se pudo calcular el siguiente crawl automatico.");
}
