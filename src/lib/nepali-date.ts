import NepaliDate from "nepali-date-converter";

export const BS_MONTHS = [
  "Baisakh",
  "Jestha",
  "Ashadh",
  "Shrawan",
  "Bhadra",
  "Ashwin",
  "Kartik",
  "Mangsir",
  "Poush",
  "Magh",
  "Falgun",
  "Chaitra",
] as const;

export type BSYearMonth = {
  year: number;
  month: number;
};

/**
 * Convert a BS date to a JavaScript Date.
 *
 * month is 1-based:
 * Baisakh = 1
 * Chaitra = 12
 */
export function bsToDate(
  year: number,
  month: number,
  day: number
): Date {
  if (month < 1 || month > 12) {
    throw new Error("Invalid Nepali month.");
  }

  if (day < 1 || day > 32) {
    throw new Error("Invalid Nepali day.");
  }

  const nepaliDate = new NepaliDate(year, month - 1, day);

  return nepaliDate.toJsDate();
}

/**
 * Convert a JavaScript Date to BS.
 */
export function dateToBS(date: Date): BSYearMonth & { day: number } {
  const nepaliDate = NepaliDate.fromAD(date);

  return {
    year: nepaliDate.getYear(),
    month: nepaliDate.getMonth() + 1,
    day: nepaliDate.getDate(),
  };
}

/**
 * Get the Nepali month name.
 */
export function getBSMonthName(month: number): string {
  if (month < 1 || month > 12) {
    throw new Error("Invalid Nepali month.");
  }

  return BS_MONTHS[month - 1];
}

/**
 * Format a JavaScript Date as a Nepali date.
 *
 * Example:
 * 2083-04-05 BS
 * => "5 Shrawan 2083 BS"
 */
export function formatBS(date: Date): string {
  const nepaliDate = NepaliDate.fromAD(date);

  return `${nepaliDate.getDate()} ${
    BS_MONTHS[nepaliDate.getMonth()]
  } ${nepaliDate.getYear()} BS`;
}

/**
 * Convert a BS year/month into a sequential index.
 *
 * This is used for comparing Nepali months and calculating
 * billing periods.
 *
 * Example:
 * Baisakh 2083 -> 2083 * 12 + 0
 * Jestha 2083  -> 2083 * 12 + 1
 */
export function bsMonthIndex(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error("Invalid Nepali month.");
  }

  return year * 12 + (month - 1);
}

/**
 * Calculate the number of Nepali calendar months in an
 * inclusive billing period.
 *
 * Example:
 *
 * Shrawan 2083 -> Ashwin 2083
 * = 3 months
 *
 * Magh 2083 -> Baisakh 2084
 * = 4 months
 */
export function getBSMonthsInPeriod(
  startYear: number,
  startMonth: number,
  endYear: number,
  endMonth: number
): number {
  const startIndex = bsMonthIndex(startYear, startMonth);
  const endIndex = bsMonthIndex(endYear, endMonth);

  if (endIndex < startIndex) {
    throw new Error(
      "Billing end month cannot be before billing start month."
    );
  }

  return endIndex - startIndex + 1;
}

/**
 * Compare two BS year/month values.
 *
 * Returns:
 * - negative number if a comes before b
 * - 0 if they are the same month
 * - positive number if a comes after b
 */
export function compareBSMonths(
  a: BSYearMonth,
  b: BSYearMonth
): number {
  return (
    bsMonthIndex(a.year, a.month) -
    bsMonthIndex(b.year, b.month)
  );
}