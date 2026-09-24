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

export function isExpectedWorkday(
  date: Date,
  scheduleType: "MON_FRI" | "MON_SUN" | "CUSTOM",
  workdays?: string | null
): boolean {
  // Jornada custom explícita (CSV "0..6", 0=dom): vale para qualquer scheduleType.
  if (workdays) {
    const days = new Set(
      workdays.split(",")
        .map((day) => day.trim())
        .filter((day) => day !== "")
        .map((day) => Number(day))
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    );
    if (days.size > 0) return days.has(date.getUTCDay());
  }
  if (scheduleType === "MON_SUN" || scheduleType === "CUSTOM") return true;
  const day = date.getUTCDay();
  return day >= 1 && day <= 5;
}
