import { formatDate, parseDate } from "../lib/dates.js";

const TIME_ZONE = "America/Sao_Paulo";

function getSaoPauloDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: String(values.year),
    month: String(values.month),
    day: String(values.day)
  };
}

export function formatDateKeyInSaoPaulo(date: Date = new Date()) {
  const parts = getSaoPauloDateParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getServerToday() {
  return parseDate(formatDateKeyInSaoPaulo());
}

export function isFutureDate(date: Date) {
  // Date-only values from Prisma @db.Date are compared as YYYY-MM-DD keys.
  // Converting the input date to Sao Paulo could shift UTC midnight to the previous day.
  return formatDate(date) > formatDateKeyInSaoPaulo();
}

export function assertNoFutureDates(dates: Date[]) {
  const invalidDates = [...new Set(dates.filter(isFutureDate).map(formatDate))].sort();

  return {
    ok: invalidDates.length === 0,
    invalidDates
  };
}
