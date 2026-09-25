import type { BillingPeriod } from "../types";

export type PeriodFilter = { year: string; query: string; onlyOpen: boolean };

export function getPeriodYears(periods: BillingPeriod[]): string[] {
  const years = new Set<string>();
  for (const p of periods) {
    const m = p.startDate?.slice(0, 4);
    if (m) years.add(m);
    else {
      const y = p.label.match(/(19|20)\d{2}/)?.[0];
      if (y) years.add(y);
    }
  }
  return [...years].sort().reverse();
}

export function filterPeriods(periods: BillingPeriod[], filter: PeriodFilter): BillingPeriod[] {
  const q = filter.query.trim().toLowerCase();
  return periods.filter((p) => {
    if (filter.onlyOpen && p.status !== "OPEN") return false;
    if (filter.year !== "all") {
      const y = p.startDate?.slice(0, 4) ?? p.label.match(/(19|20)\d{2}/)?.[0] ?? "";
      if (y !== filter.year) return false;
    }
    if (q && !p.label.toLowerCase().includes(q)) return false;
    return true;
  });
}

export function groupPeriodsByYear(periods: BillingPeriod[]): Array<{ year: string; periods: BillingPeriod[]; openCount: number }> {
  const map = new Map<string, BillingPeriod[]>();
  for (const p of periods) {
    const y = p.startDate?.slice(0, 4) ?? p.label.match(/(19|20)\d{2}/)?.[0] ?? "Outros";
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(p);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([year, list]) => ({ year, periods: list, openCount: list.filter((p) => p.status === "OPEN").length }));
}
