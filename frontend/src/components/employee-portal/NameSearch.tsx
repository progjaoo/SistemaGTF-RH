import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmployeePortalSearchResult } from "../../types";

export function NameSearch({
  query,
  results,
  loading,
  error,
  onQueryChange,
  onSearch,
  onSelect
}: {
  query: string;
  results: EmployeePortalSearchResult[];
  loading: boolean;
  error: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelect: (employee: EmployeePortalSearchResult) => void;
}) {
  return (
    <section className="grid w-[min(520px,100%)] gap-[18px] rounded-lg border border-line bg-surface p-6 shadow-[0_18px_48px_rgb(32_38_44/0.08)]">
      <div>
        <h1 className="m-0 text-[clamp(1.8rem,7vw,2.6rem)]">Portal do Colaborador</h1>
        <p className="mt-2 text-muted">Digite seu nome para confirmar o almoço lançado para você.</p>
      </div>

      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <div className="grid gap-[6px]">
          <label htmlFor="employee-name" className="text-[0.82rem] font-bold text-muted">Nome</label>
          <input
            id="employee-name"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Digite parte do seu nome"
            autoComplete="name"
            required
            className="min-h-10 w-full rounded-lg border border-line bg-white px-[10px] py-2 text-ink focus:border-teal focus:outline-none"
          />
        </div>
        <Button type="submit" disabled={loading}>
          <Search size={17} />
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </form>

      {error && <p className="rounded-lg border border-danger/30 bg-danger/5 px-[10px] py-[10px] font-bold text-danger">{error}</p>}

      {results.length > 0 && (
        <div className="grid gap-2">
          <span className="text-[0.86rem] font-extrabold text-muted">Selecione seu cadastro</span>
          {results.map((employee) => (
            <button
              key={employee.id}
              type="button"
              onClick={() => onSelect(employee)}
              className="min-h-[46px] w-full rounded-lg border border-line bg-white px-3 py-[10px] text-left font-extrabold text-ink hover:border-teal/40 hover:bg-teal-bg"
            >
              {employee.name}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
