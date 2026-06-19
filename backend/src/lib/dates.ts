export function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("Data inválida. Use o formato YYYY-MM-DD.");
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function isBetween(date: Date, startDate: Date, endDate: Date): boolean {
  const current = formatDate(date);
  return current >= formatDate(startDate) && current <= formatDate(endDate);
}

export function isExpectedWorkday(date: Date, scheduleType: "MON_FRI" | "MON_SUN" | "CUSTOM"): boolean {
  if (scheduleType === "MON_SUN" || scheduleType === "CUSTOM") return true;
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}
