export const PROSPECTING_CRON = "0 9 * * 1,3,5";

export function getNextProspectingCrawlAt(referenceDate = new Date()) {
  const validWeekdays = new Set([1, 3, 5]);

  for (let offsetDays = 0; offsetDays < 14; offsetDays += 1) {
    const candidate = new Date(
      Date.UTC(
        referenceDate.getUTCFullYear(),
        referenceDate.getUTCMonth(),
        referenceDate.getUTCDate() + offsetDays,
        9,
        0,
        0,
        0
      )
    );

    if (candidate <= referenceDate) {
      continue;
    }

    if (validWeekdays.has(candidate.getUTCDay())) {
      return candidate.toISOString();
    }
  }

  throw new Error("No se pudo calcular el siguiente crawl automatico.");
}
