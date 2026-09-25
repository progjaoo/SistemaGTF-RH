import { Search } from "lucide-react";
import type { PeriodFilter } from "../../utils/periodFilters";

export default function PeriodFilterBar({
  filter, years, totalOpen, totalClosed, onChange
}: {
  filter: PeriodFilter;
  years: string[];
  totalOpen: number;
  totalClosed: number;
  onChange: (next: PeriodFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={filter.query}
          onChange={(e) => onChange({ ...filter, query: e.target.value })}
          placeholder="Buscar período…"
          aria-label="Buscar período"
          className="min-h-10 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-ink focus:border-teal focus:outline-none"
        />
      </div>
      <select
        value={filter.year}
        onChange={(e) => onChange({ ...filter, year: e.target.value })}
        className="min-h-10 rounded-lg border border-line bg-white px-3 text-ink"
        aria-label="Filtrar por ano"
      >
        <option value="all">Todos os anos</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <button
        type="button"
        onClick={() => onChange({ ...filter, onlyOpen: !filter.onlyOpen })}
        aria-pressed={filter.onlyOpen}
        title={filter.onlyOpen ? "Mostrar todos" : "Mostrar somente abertos"}
        className={`min-h-10 rounded-lg border px-3 text-sm font-bold ${filter.onlyOpen ? "border-teal bg-teal-bg text-teal-deep" : "border-line bg-white text-muted"}`}
      >
        Abertos ({totalOpen}) · Fechados ({totalClosed})
      </button>
    </div>
  );
}
