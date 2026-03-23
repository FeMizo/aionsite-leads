export type SortDirection = "asc" | "desc";
export type SortType = "string" | "number" | "date";

function isEmptySortValue(value: unknown) {
  return value === null || value === undefined || value === "";
}

function toComparableNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (typeof value === "string" && value.trim()) {
    const numericValue = Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
}

function toComparableDate(value: unknown) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim()) {
    const timestamp = new Date(value).getTime();
    return Number.isNaN(timestamp) ? null : timestamp;
  }

  return null;
}

export function compareSortValues(
  left: unknown,
  right: unknown,
  type: SortType,
  direction: SortDirection
) {
  if (isEmptySortValue(left) && isEmptySortValue(right)) {
    return 0;
  }

  if (isEmptySortValue(left)) {
    return 1;
  }

  if (isEmptySortValue(right)) {
    return -1;
  }

  let result = 0;

  if (type === "number") {
    const leftNumber = toComparableNumber(left);
    const rightNumber = toComparableNumber(right);

    if (leftNumber === null && rightNumber === null) {
      result = 0;
    } else if (leftNumber === null) {
      result = 1;
    } else if (rightNumber === null) {
      result = -1;
    } else {
      result = leftNumber - rightNumber;
    }
  } else if (type === "date") {
    const leftDate = toComparableDate(left);
    const rightDate = toComparableDate(right);

    if (leftDate === null && rightDate === null) {
      result = 0;
    } else if (leftDate === null) {
      result = 1;
    } else if (rightDate === null) {
      result = -1;
    } else {
      result = leftDate - rightDate;
    }
  } else {
    result = String(left).localeCompare(String(right), undefined, {
      numeric: true,
      sensitivity: "base",
    });
  }

  return direction === "asc" ? result : result * -1;
}
