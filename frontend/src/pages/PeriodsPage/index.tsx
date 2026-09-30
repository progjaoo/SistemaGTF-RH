import { FormEvent, useMemo, useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState, Field, Panel, PanelHeader } from "../../components/ui";
import ActionGuide from "../../components/ActionGuide";
import { api } from "../../api";
import type { BillingPeriod } from "../../types";
import type { Tab } from "../../navigation";
import { buildYearPreview } from "../../utils/periods";
import { filterPeriods, getPeriodYears, groupPeriodsByYear } from "../../utils/periodFilters";
import type { PeriodFilter } from "../../utils/periodFilters";
import PeriodFilterBar from "./PeriodFilterBar";
import PeriodYearGroup from "./PeriodYearGroup";

export default function PeriodsPage({
  periods,
  token,
  onSave,
  onClose,
  onReopen,
  onExport,
  onReload,
  onNavigate
}: {
  periods: BillingPeriod[];
  token: string;
  onSave: (payload: Pick<BillingPeriod, "label" | "startDate" | "endDate">) => Promise<void>;
  onClose: (period: BillingPeriod) => Promise<void>;
  onReopen: (period: BillingPeriod) => Promise<void>;
  onExport: (period: BillingPeriod) => Promise<void>;
  onReload: () => Promise<void>;
  onNavigate?: (tab: Tab) => void;
}) {
  const [form, setForm] = useState({ label: "", startDate: "", endDate: "" });
  const [yearForm, setYearForm] = useState({ year: String(new Date().getFullYear() + 1), cutDay: "6", prefix: "" });
  const [yearBusy, setYearBusy] = useState(false);
  const [yearMessage, setYearMessage] = useState("");
  const [reopenTarget, setReopenTarget] = useState<BillingPeriod | null>(null);
  const [deleting, setDeleting] = useState<BillingPeriod | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [filter, setFilter] = useState<PeriodFilter>({ year: "all", query: "", onlyOpen: false });
  const [newOpen, setNewOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave(form);
    setForm({ label: "", startDate: "", endDate: "" });
    setNewOpen(false);
  }

  const yearNum = Number(yearForm.year);
  const cutNum = Number(yearForm.cutDay);
  const yearValid = Number.isInteger(yearNum) && yearNum >= 2000 && yearNum <= 2100;
  const cutValid = Number.isInteger(cutNum) && cutNum >= 1 && cutNum <= 28;
  const yearPreview = yearValid && cutValid ? buildYearPreview(yearNum, cutNum, yearForm.prefix) : [];

  async function submitYear(event: FormEvent) {
    event.preventDefault();
    if (!yearValid || !cutValid) return;
    setYearBusy(true);
    setYearMessage("");
    try {
      const result = await api.bulkYearPeriods(token, {
        year: yearNum,
        cutDay: cutNum,
        labelPrefix: yearForm.prefix.trim() || undefined
      });
      setYearMessage(`${result.periods.length} períodos de ${yearNum} criados.`);
      toast.success(`${result.periods.length} períodos de ${yearNum} criados.`);
      await onReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível gerar o ano.";
      setYearMessage(`${message} Confira os períodos existentes na lista.`);
      toast.error(message);
    } finally {
      setYearBusy(false);
    }
  }

  async function confirmReopen() {
    if (!reopenTarget) return;
    const period = reopenTarget;
    setReopenTarget(null);
    await onReopen(period);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await api.deletePeriod(token, deleting.id);
      toast.success("Período excluído.");
      setDeleting(null);
      await onReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível excluir.";
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleteBusy(false);
    }
  }

  const years = useMemo(() => getPeriodYears(periods), [periods]);
  const filtered = useMemo(() => filterPeriods(periods, filter), [periods, filter]);
  const groups = useMemo(() => groupPeriodsByYear(filtered), [filtered]);
  const totalOpen = useMemo(() => periods.filter((p) => p.status === "OPEN").length, [periods]);
  const totalClosed = periods.length - totalOpen;

  return (
    <>
      <Panel>
        <PanelHeader>
          <div>
            <h2>Períodos</h2>
            <p>{totalOpen} abertos · {totalClosed} fechados</p>
          </div>
          <div className="flex flex-wrap gap-2 max-[520px]:w-full max-[520px]:[&>button]:w-full">
            <Button type="button" variant="outline" onClick={() => setNewOpen(true)}>
              <Plus size={17} /> Novo período
            </Button>
            <Button type="button" onClick={() => setYearOpen(true)}>
              <CalendarPlus size={17} /> Gerar ano
            </Button>
          </div>
        </PanelHeader>
        <div className="grid gap-3">
          <PeriodFilterBar filter={filter} years={years} totalOpen={totalOpen} totalClosed={totalClosed} onChange={setFilter} />
          {deleteError && onNavigate && (
            <ActionGuide
              targetLabel="Lançamentos"
              hint="Apague ou mova os lançamentos do período antes de excluí-lo."
              onGo={() => onNavigate("records")}
            />
          )}
          {groups.length === 0 ? (
            <EmptyState>Nenhum período encontrado para o filtro.</EmptyState>
          ) : (
            <div className="grid gap-3">
              {groups.map((g) => (
                <PeriodYearGroup
                  key={g.year}
                  year={g.year}
                  periods={g.periods}
                  openCount={g.openCount}
                  defaultOpen={g.openCount > 0 || g.year === years[0]}
                  onExport={onExport}
                  onClose={onClose}
                  onAskReopen={setReopenTarget}
                  onAskDelete={setDeleting}
                />
              ))}
            </div>
          )}
        </div>
      </Panel>

      <Dialog open={newOpen} onOpenChange={(open) => { if (!open) setNewOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo período</DialogTitle>
            <DialogDescription>Crie um período avulso. Para o ano todo, use Gerar ano.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field>
                <label htmlFor="period-label">Rótulo</label>
                <input id="period-label" value={form.label} onChange={(event) => setForm({ ...form, label: event.target.value })} required />
              </Field>
              <Field>
                <label htmlFor="period-start">Início</label>
                <input id="period-start" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required />
              </Field>
              <Field>
                <label htmlFor="period-end">Fim</label>
                <input id="period-end" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} required />
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Criar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={yearOpen} onOpenChange={(open) => { if (!open) setYearOpen(false); }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Gerar ano inteiro</DialogTitle>
            <DialogDescription>12 mensais pelo dia de corte. Nada é criado se houver conflito.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitYear} className="grid gap-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr]">
              <Field>
                <label htmlFor="year-num">Ano</label>
                <input
                  id="year-num"
                  type="number"
                  value={yearForm.year}
                  min={2000}
                  max={2100}
                  onChange={(event) => setYearForm({ ...yearForm, year: event.target.value })}
                  required
                />
              </Field>
              <Field>
                <label htmlFor="year-cut">Dia de corte (1–28)</label>
                <input
                  id="year-cut"
                  type="number"
                  value={yearForm.cutDay}
                  min={1}
                  max={28}
                  onChange={(event) => setYearForm({ ...yearForm, cutDay: event.target.value })}
                  required
                />
              </Field>
              <Field>
                <label htmlFor="year-prefix">Prefixo (opcional)</label>
                <input
                  id="year-prefix"
                  value={yearForm.prefix}
                  onChange={(event) => setYearForm({ ...yearForm, prefix: event.target.value })}
                  placeholder="Ex: GTF"
                />
              </Field>
            </div>
            <div>
              <Button type="submit" disabled={yearBusy || !yearValid || !cutValid}>
                <CalendarPlus size={17} />
                {yearBusy ? "Gerando..." : `Gerar ${yearValid ? yearNum : "ano"}`}
              </Button>
            </div>
            {yearMessage && <EmptyState>{yearMessage}</EmptyState>}
            {yearPreview.length > 0 && (
              <div className="max-h-56 overflow-auto rounded-lg border border-line text-sm">
                {yearPreview.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 last:border-0">
                    <span>{item.label}</span>
                    <span className="text-muted">{item.startDate.slice(8, 10)}/{item.startDate.slice(5, 7)} → {item.endDate.slice(8, 10)}/{item.endDate.slice(5, 7)}</span>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setYearOpen(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={reopenTarget !== null} onOpenChange={(open) => { if (!open) setReopenTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir período</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja reabrir <strong>{reopenTarget?.label}</strong>? Os lançamentos voltarão a ficar editáveis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReopenTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={() => void confirmReopen()}>
              Reabrir período
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir período</DialogTitle>
            <DialogDescription>
              Excluir <strong>{deleting?.label}</strong> definitivamente? Só períodos abertos e sem lançamentos podem ser excluídos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" disabled={deleteBusy} onClick={() => void confirmDelete()}>
              {deleteBusy ? "Excluindo..." : "Excluir período"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
