export const MEXICO_CITY_TIME_ZONE = "America/Mexico_City";

type TimeZoneParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
};

const FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getPartsFormatter(timeZone: string) {
  const cached = FORMATTER_CACHE.get(timeZone);

  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  });

  FORMATTER_CACHE.set(timeZone, formatter);
  return formatter;
}

function getFormatterParts(date: Date, timeZone: string) {
  return getPartsFormatter(timeZone).formatToParts(date);
}

export function getTimeZoneParts(
  date = new Date(),
  timeZone = MEXICO_CITY_TIME_ZONE
): TimeZoneParts {
  const values = new Map<string, string>();

  for (const part of getFormatterParts(date, timeZone)) {
    if (part.type !== "literal") {
      values.set(part.type, part.value);
    }
  }

  return {
    year: Number(values.get("year") || 0),
    month: Number(values.get("month") || 0),
    day: Number(values.get("day") || 0),
    hour: Number(values.get("hour") || 0),
    minute: Number(values.get("minute") || 0),
    second: Number(values.get("second") || 0),
    weekday: WEEKDAY_INDEX[values.get("weekday") || "Sun"] ?? 0,
  };
}

export function getMexicoCityTimeParts(date = new Date()): TimeZoneParts {
  return getTimeZoneParts(date, MEXICO_CITY_TIME_ZONE);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    0
  );

  return asUtc - date.getTime();
}

export function createTimeZoneDate(
  input: {
    year: number;
    month: number;
    day: number;
    hour?: number;
    minute?: number;
    second?: number;
  },
  timeZone = MEXICO_CITY_TIME_ZONE
) {
  const utcGuess = Date.UTC(
    input.year,
    input.month - 1,
    input.day,
    input.hour || 0,
    input.minute || 0,
    input.second || 0,
    0
  );
  const guessDate = new Date(utcGuess);
  const offsetMs = getTimeZoneOffsetMs(guessDate, timeZone);

  return new Date(utcGuess - offsetMs);
}

export function createMexicoCityDate(input: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}) {
  return createTimeZoneDate(input, MEXICO_CITY_TIME_ZONE);
}

export function addTimeZoneDays(
  date: Date,
  offsetDays: number,
  timeZone = MEXICO_CITY_TIME_ZONE,
  overrides: {
    hour?: number;
    minute?: number;
    second?: number;
  } = {}
) {
  const parts = getTimeZoneParts(date, timeZone);

  return createTimeZoneDate({
    year: parts.year,
    month: parts.month,
    day: parts.day + offsetDays,
    hour: overrides.hour ?? parts.hour,
    minute: overrides.minute ?? parts.minute,
    second: overrides.second ?? parts.second,
  }, timeZone);
}

export function addMexicoCityDays(
  date: Date,
  offsetDays: number,
  overrides: {
    hour?: number;
    minute?: number;
    second?: number;
  } = {}
) {
  return addTimeZoneDays(date, offsetDays, MEXICO_CITY_TIME_ZONE, overrides);
}

export function getTimeZoneDayBounds(
  referenceDate = new Date(),
  timeZone = MEXICO_CITY_TIME_ZONE
) {
  const parts = getTimeZoneParts(referenceDate, timeZone);
  const start = createTimeZoneDate(
    {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: 0,
      minute: 0,
      second: 0,
    },
    timeZone
  );
  const nextStart = addTimeZoneDays(start, 1, timeZone, {
    hour: 0,
    minute: 0,
    second: 0,
  });

  return {
    start,
    end: nextStart,
  };
}

export function getMexicoCityDayBounds(referenceDate = new Date()) {
  return getTimeZoneDayBounds(referenceDate, MEXICO_CITY_TIME_ZONE);
}
