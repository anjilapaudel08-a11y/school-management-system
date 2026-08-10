import NepaliDate from "nepali-date-converter";

export function bsToDate(
  year: number,
  month: number,
  day: number
): Date {
  const nepaliDate = new NepaliDate(year, month - 1, day);
  return nepaliDate.toJsDate();
}

export function dateToBS(date: Date) {
  const nepaliDate = NepaliDate.fromAD(date);

  return {
    year: nepaliDate.getYear(),
    month: nepaliDate.getMonth() + 1,
    day: nepaliDate.getDate(),
  };
}

const BS_MONTHS = [
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
];

export function formatBS(date: Date): string {
  const nepaliDate = NepaliDate.fromAD(date);

  return `${nepaliDate.getDate()} ${
    BS_MONTHS[nepaliDate.getMonth()]
  } ${nepaliDate.getYear()} BS`;
}