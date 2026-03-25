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

const PARTS_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: MEXICO_CITY_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  weekday: "short",
  hourCycle: "h23",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getFormatterParts(date: Date) {
  return PARTS_FORMATTER.formatToParts(date);
}

export function getMexicoCityTimeParts(date = new Date()): TimeZoneParts {
  const values = new Map<string, string>();

  for (const part of getFormatterParts(date)) {
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

function getTimeZoneOffsetMs(date: Date) {
  const parts = getMexicoCityTimeParts(date);
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

export function createMexicoCityDate(input: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}) {
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
  const offsetMs = getTimeZoneOffsetMs(guessDate);

  return new Date(utcGuess - offsetMs);
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
  const parts = getMexicoCityTimeParts(date);

  return createMexicoCityDate({
    year: parts.year,
    month: parts.month,
    day: parts.day + offsetDays,
    hour: overrides.hour ?? parts.hour,
    minute: overrides.minute ?? parts.minute,
    second: overrides.second ?? parts.second,
  });
}

export function getMexicoCityDayBounds(referenceDate = new Date()) {
  const parts = getMexicoCityTimeParts(referenceDate);
  const start = createMexicoCityDate({
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: 0,
    minute: 0,
    second: 0,
  });
  const nextStart = addMexicoCityDays(start, 1, {
    hour: 0,
    minute: 0,
    second: 0,
  });

  return {
    start,
    end: nextStart,
  };
}
