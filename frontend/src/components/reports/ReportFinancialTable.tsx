import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { DataTable, EmptyState } from "../ui";
import type { EmployeeTotal } from "../../types";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value ?? 0);

type SortKey = "name" | "taken" | "notTaken" | "pending" | "unitPrice" | "amount";
type Filter = "all" | "consumed" | "pending";

const SORT_LABEL: Record<SortKey, string> = {
  name: "Funcionário",
  taken: "Almoços (pegou)",
  notTaken: "Não pegou",
  pending: "Pendentes",
  unitPrice: "Preço unitário",
  amount: "Total a descontar"
};

function unitPriceOf(row: EmployeeTotal): number {
  return row.unitPrices[0] ?? 0;
}

function valueOf(row: EmployeeTotal, key: SortKey): number | string {
  switch (key) {
    case "name":
      return row.employeeName.toLowerCase();
    case "taken":
      return row.taken;
    case "notTaken":
      return row.notTaken;
    case "pending":
      return row.pending;
    case "unitPrice":
      return unitPriceOf(row);
    case "amount":
      return row.amount;
  }
}

export default function ReportFinancialTable({ rows }: { rows: EmployeeTotal[] }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("amount");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? "asc" : "desc");
    }
  }

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      if (filter === "consumed" && row.quantity <= 0) return false;
      if (filter === "pending" && row.pending <= 0) return false;
      if (term !== "" && !row.employeeName.toLowerCase().includes(term)) return false;
      return true;
    });
    return [...filtered].sort((a, b) => {
      const va = valueOf(a, sortKey);
      const vb = valueOf(b, sortKey);
      const cmp = typeof va === "string" || typeof vb === "string" ? String(va).localeCompare(String(vb), "pt-BR") : Number(va) - Number(vb);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, search, filter, sortKey, sortDir]);

  const totals = useMemo(
    () =>
      visible.reduce(
        (acc, row) => ({
          taken: acc.taken + row.taken,
          notTaken: acc.notTaken + row.notTaken,
          pending: acc.pending + row.pending,
          amount: acc.amount + row.amount
        }),
        { taken: 0, notTaken: 0, pending: 0, amount: 0 }
      ),
    [visible]
  );

  const filters: Array<{ key: Filter; label: string }> = [
    { key: "all", label: "Todos" },
    { key: "consumed", label: "Com consumo" },
    { key: "pending", label: "Com pendências" }
  ];

  const columns: SortKey[] = ["name", "taken", "notTaken", "pending", "unitPrice", "amount"];

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-52">
          <Search size={15} aria-hidden className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar colaborador..."
            aria-label="Buscar colaborador por nome"
            className="min-h-10 w-full rounded-lg border border-line bg-surface py-2 pr-[10px] pl-9 text-ink focus:border-teal focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtro rápido">
          {filters.map((option) => (
            <button
              key={option.key}
              type="button"
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
              className={
                filter === option.key
                  ? "min-h-10 rounded-lg border border-teal-deep bg-teal-bg px-3 text-[0.85rem] font-bold text-teal-deep"
                  : "min-h-10 rounded-lg border border-line bg-surface px-3 text-[0.85rem] font-bold text-muted hover:text-ink"
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState>Nenhum colaborador encontrado para os filtros aplicados.</EmptyState>
      ) : (
        <div className="min-w-0 overflow-x-auto">
          <DataTable>
            <thead>
              <tr>
                {columns.map((key) => (
                  <th key={key} scope="col" aria-sort={sortKey === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}>
                    <button
                      type="button"
                      onClick={() => toggleSort(key)}
                      aria-label={`Ordenar por ${SORT_LABEL[key]}`}
                      className="inline-flex items-center gap-1 text-inherit uppercase hover:text-ink"
                    >
                      {SORT_LABEL[key]}
                      {sortKey === key &&
                        (sortDir === "asc" ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map((row) => (
                <tr key={row.employeeId}>
                  <td className="font-bold whitespace-nowrap">{row.employeeName}</td>
                  <td className="tabular-nums">{row.taken}</td>
                  <td className="tabular-nums">{row.notTaken}</td>
                  <td className="tabular-nums">{row.pending}</td>
                  <td className="tabular-nums whitespace-nowrap" title={row.unitPrices.map((p) => formatCurrency(p)).join(" · ")}>
                    {formatCurrency(unitPriceOf(row))}
                  </td>
                  <td className="tabular-nums whitespace-nowrap font-bold text-teal-deep">{formatCurrency(row.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-teal-bg/60 font-bold">
                <td>Total ({visible.length} {visible.length === 1 ? "colaborador" : "colaboradores"})</td>
                <td className="tabular-nums">{totals.taken}</td>
                <td className="tabular-nums">{totals.notTaken}</td>
                <td className="tabular-nums">{totals.pending}</td>
                <td aria-hidden>—</td>
                <td className="tabular-nums whitespace-nowrap text-teal-deep">{formatCurrency(totals.amount)}</td>
              </tr>
            </tfoot>
          </DataTable>
        </div>
      )}
    </div>
  );
}
