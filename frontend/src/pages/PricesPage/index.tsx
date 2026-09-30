import { FormEvent, useMemo, useState } from "react";
import { Pencil, Plus, Square, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, Field, FormGrid, InlineActions, Panel, PanelHeader, TwoColumn } from "../../components/ui";
import ActionGuide from "../../components/ActionGuide";
import type { Employee, MealPrice } from "../../types";
import type { Tab } from "../../navigation";
import { fullDate } from "../../utils/date";
import { formatCurrency } from "../../utils/format";

type PriceForm = { value: string; validFrom: string; validTo: string; employeeId: string };

const EMPTY_FORM: PriceForm = { value: "8.50", validFrom: "2026-06-01", validTo: "", employeeId: "" };

const STATUS_BADGE = {
  VIGENTE: { variant: "good", label: "Vigente" },
  FUTURA: { variant: "info", label: "Futura" },
  ENCERRADA: { variant: "muted", label: "Encerrada" }
} as const;

export default function PricesPage({
  token,
  prices,
  employees,
  onReload,
  onNavigate
}: {
  token: string;
  prices: MealPrice[];
  employees: Employee[];
  onReload: () => Promise<void>;
  onNavigate?: (tab: Tab) => void;
}) {
  const [form, setForm] = useState<PriceForm>(EMPTY_FORM);
  const [editing, setEditing] = useState<MealPrice | null>(null);
  const [scopeFilter, setScopeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [closing, setClosing] = useState<MealPrice | null>(null);
  const [deleting, setDeleting] = useState<MealPrice | null>(null);
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const visiblePrices = useMemo(() => {
    return prices.filter((price) => {
      if (scopeFilter === "global" && price.employeeId) return false;
      if (scopeFilter && scopeFilter !== "global" && price.employeeId !== scopeFilter) return false;
      if (statusFilter && price.status !== statusFilter) return false;
      return true;
    });
  }, [prices, scopeFilter, statusFilter]);

  function startEdit(price: MealPrice) {
    setEditing(price);
    setForm({
      value: String(price.value),
      validFrom: price.validFrom,
      validTo: price.validTo ?? "",
      employeeId: price.employeeId ?? ""
    });
    setFormError("");
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const payload = {
        value: Number(form.value),
        validFrom: form.validFrom,
        validTo: form.validTo || null,
        employeeId: form.employeeId || null
      };
      if (editing) {
        await api.updateMealPrice(token, editing.id, payload);
        toast.success("Preço atualizado.");
      } else {
        await api.createMealPrice(token, payload);
        toast.success("Preço cadastrado.");
      }
      cancelEdit();
      await onReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível salvar o preço.";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmClose() {
    if (!closing || !endDate) return;
    setBusy(true);
    try {
      await api.closeMealPrice(token, closing.id, endDate);
      toast.success("Vigência encerrada.");
      setClosing(null);
      setEndDate("");
      await onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível encerrar.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await api.deleteMealPrice(token, deleting.id);
      toast.success("Preço excluído.");
      if (editing?.id === deleting.id) cancelEdit();
      setDeleting(null);
      await onReload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível excluir.";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <h2>{editing ? "Editar preço" : "Novo preço"}</h2>
        </PanelHeader>
        <FormGrid onSubmit={submit}>
          <Field>
            <label>Valor</label>
            <input type="number" step="0.01" min="0.01" value={form.value} onChange={(event) => setForm({ ...form, value: event.target.value })} required />
          </Field>
          <Field>
            <label>Vigência inicial</label>
            <input type="date" value={form.validFrom} onChange={(event) => setForm({ ...form, validFrom: event.target.value })} required />
          </Field>
          <Field>
            <label>Vigência final (opcional — em branco vale por tempo indeterminado)</label>
            <input type="date" value={form.validTo} onChange={(event) => setForm({ ...form, validTo: event.target.value })} />
          </Field>
          <Field>
            <label>Funcionário</label>
            <select value={form.employeeId} onChange={(event) => setForm({ ...form, employeeId: event.target.value })}>
              <option value="">Preço global</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </Field>
          {formError && <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-[10px] text-[0.9rem] font-bold text-danger-ink">{formError}</p>}
          {formError && onNavigate && (
            <ActionGuide
              targetLabel="Relatórios"
              hint="O valor congelado segue valendo no fechado — aqui, encerre a vigência e crie uma nova."
              onGo={() => onNavigate("reports")}
            />
          )}
          <InlineActions>
            <Button type="submit" disabled={busy}>
              <Plus size={17} />
              {busy ? "Salvando..." : editing ? "Atualizar" : "Cadastrar"}
            </Button>
            {editing && (
              <Button type="button" variant="outline" onClick={cancelEdit}>
                Cancelar edição
              </Button>
            )}
          </InlineActions>
        </FormGrid>
      </Panel>

      <Panel>
        <PanelHeader>
          <div>
            <h2>Histórico de preços</h2>
            <p>Preços alimentam relatórios: exclusão e alteração bloqueadas em período fechado — encerre a vigência e crie uma nova.</p>
          </div>
        </PanelHeader>
        <div className="mb-3 flex flex-wrap gap-2">
          <select
            value={scopeFilter}
            onChange={(event) => setScopeFilter(event.target.value)}
            aria-label="Filtrar por escopo"
            className="min-h-10 rounded-lg border border-line bg-surface px-[10px] text-ink"
          >
            <option value="">Todos os escopos</option>
            <option value="global">Global</option>
            {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filtrar por status"
            className="min-h-10 rounded-lg border border-line bg-surface px-[10px] text-ink"
          >
            <option value="">Todos os status</option>
            <option value="VIGENTE">Vigentes</option>
            <option value="FUTURA">Futuras</option>
            <option value="ENCERRADA">Encerradas</option>
          </select>
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Escopo</th>
              <th>Vigência</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {visiblePrices.map((price) => (
              <tr key={price.id}>
                <td>{price.employee?.name ?? "Global"}</td>
                <td>{fullDate(price.validFrom)}{price.validTo ? ` a ${fullDate(price.validTo)}` : ""}</td>
                <td>{formatCurrency(price.value)}</td>
                <td><Badge variant={STATUS_BADGE[price.status].variant}>{STATUS_BADGE[price.status].label}</Badge></td>
                <td>
                  <InlineActions>
                    <Button type="button" variant="outline" onClick={() => startEdit(price)}>
                      <Pencil size={16} />
                      Editar
                    </Button>
                    {!price.validTo && (
                      <Button type="button" variant="outline" onClick={() => { setClosing(price); setEndDate(""); }}>
                        <Square size={16} />
                        Encerrar
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => setDeleting(price)}>
                      <Trash2 size={16} />
                      Excluir
                    </Button>
                  </InlineActions>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>

      <Dialog open={closing !== null} onOpenChange={(open) => { if (!open) setClosing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Encerrar vigência</DialogTitle>
            <DialogDescription>
              Encerrar o preço de {closing ? formatCurrency(closing.value) : ""} em que data? Lançamentos até essa data continuam valendo; o histórico é preservado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-[6px]">
            <label htmlFor="close-date" className="text-[0.82rem] font-bold text-muted">Último dia válido</label>
            <input
              id="close-date"
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="min-h-10 w-full rounded-lg border border-line bg-surface px-[10px] text-ink"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setClosing(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={!endDate || busy} onClick={() => void confirmClose()}>
              Encerrar vigência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => { if (!open) setDeleting(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir preço</DialogTitle>
            <DialogDescription>
              Excluir {deleting ? `${deleting.employee?.name ?? "Global"} · ${formatCurrency(deleting.value)}` : ""} definitivamente?
              Lançamentos em período aberto serão recalculados. Se o preço tiver histórico em período fechado, a exclusão é bloqueada — encerre a vigência e crie uma nova.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleting(null)}>
              Cancelar
            </Button>
            <Button type="button" disabled={busy} onClick={() => void confirmDelete()}>
              {busy ? "Excluindo..." : "Excluir preço"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TwoColumn>
  );
}
