import { KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { EmployeePortalSearchResult } from "../../types";

export function AccessCodeStep({
  employee,
  loading,
  error,
  onSubmit,
  onBack
}: {
  employee: EmployeePortalSearchResult;
  loading: boolean;
  error: string;
  onSubmit: (code: string) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");

  return (
    <section className="grid w-[min(520px,100%)] gap-[18px] rounded-lg border border-line bg-surface p-6 shadow-[0_18px_48px_rgb(32_38_44/0.08)]">
      <div>
        <h1 className="m-0 text-[clamp(1.5rem,6vw,2.1rem)]">Olá, {employee.name}</h1>
        <p className="mt-2 text-muted">Digite seu código de acesso de 6 dígitos (entregue pelo RH).</p>
      </div>

      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(code);
        }}
      >
        <div className="grid gap-[6px]">
          <label htmlFor="access-code" className="text-[0.82rem] font-bold text-muted">Código de acesso</label>
          <input
            id="access-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
            className="min-h-[44px] rounded-lg border border-line bg-white px-[10px] py-2 text-center text-[1.6rem] tracking-[0.5em] text-ink focus:border-teal focus:outline-none"
          />
        </div>
        <Button type="submit" disabled={loading || code.length !== 6}>
          <KeyRound size={17} />
          {loading ? "Verificando..." : "Entrar"}
        </Button>
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 rounded-lg border border-line bg-white font-extrabold text-teal-deep"
        >
          Trocar nome
        </button>
      </form>

      {error && <p className="rounded-lg border border-danger/30 bg-danger/5 px-[10px] py-[10px] font-bold text-danger-ink">{error}</p>}
    </section>
  );
}
