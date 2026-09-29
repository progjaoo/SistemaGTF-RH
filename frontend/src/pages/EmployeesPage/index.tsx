import { FormEvent, useMemo, useState } from "react";
import { Ban, KeyRound, Pencil, Plus, Save, Search, UserX } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, Field, Panel, PanelHeader } from "../../components/ui";
import { cn } from "@/lib/utils";
import type { Employee, EmployeeStatus, ScheduleType } from "../../types";
import { initials } from "../../utils/format";
import { scheduleLabels, statusLabels, workdayLabel } from "../../utils/labels";

function lastAccessLabel(iso: string | null): string {
  if (!iso) return "Nunca entrou";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Hoje";
  if (days === 1) return "Há 1 dia";
  return `Há ${days} dias`;
}

function accessBadgeVariant(access: Employee["portalAccess"]) {
  return access === "active" ? "good" : access === "pending" ? "warn" : "muted";
}

function accessLabel(access: Employee["portalAccess"]) {
  return access === "active" ? "Ativo" : access === "pending" ? "Pendente" : "Sem acesso";
}

const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" }
];

const EMPTY_FORM = {
  name: "",
  status: "ACTIVE",
  scheduleType: "MON_FRI",
  workdays: null,
  jobTitle: null,
  hasAccessCode: false,
  admissionDate: "",
  terminationDate: ""
} as const;

export default function EmployeesPage({
  employees,
  canEdit,
  token,
  onSave,
  onInactivate,
  onReload
}: {
  employees: Employee[];
  canEdit: boolean;
  token: string;
  onSave: (payload: Omit<Employee, "id" | "hasAccessCode" | "portalAccess" | "lastPortalAccessAt">, id?: string) => Promise<void>;
  onInactivate: (id: string) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<Omit<Employee, "id" | "portalAccess" | "lastPortalAccessAt">>({
    ...EMPTY_FORM,
    workdays: null,
    jobTitle: null
  });
  const [query, setQuery] = useState("");

  const activeCount = useMemo(() => employees.filter((e) => e.status === "ACTIVE").length, [employees]);
  const visibleEmployees = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? employees.filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            (e.jobTitle ?? "").toLowerCase().includes(q)
        )
      : employees;
    return [...list].sort((a, b) => {
      if (a.status !== b.status) return a.status === "ACTIVE" ? -1 : 1;
      return a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
    });
  }, [employees, query]);

  function toggleWorkday(day: number) {
    setForm((current) => {
      const selected = new Set(current.workdays ?? []);
      if (selected.has(day)) selected.delete(day);
      else selected.add(day);
      const sorted = [...selected].sort((a, b) => a - b);
      return { ...current, workdays: sorted.length > 0 ? sorted : null };
    });
  }

  function openNew() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, workdays: null, jobTitle: null });
    setFormOpen(true);
  }

  function startEdit(employee: Employee) {
    setEditing(employee);
    setForm({
      name: employee.name,
      status: employee.status,
      scheduleType: employee.scheduleType,
      workdays: employee.workdays ?? null,
      jobTitle: employee.jobTitle ?? null,
      hasAccessCode: employee.hasAccessCode,
      admissionDate: employee.admissionDate ?? "",
      terminationDate: employee.terminationDate ?? ""
    });
    setFormOpen(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    // hasAccessCode é só leitura (gerenciado nas ações de código abaixo).
    const { hasAccessCode: _discard, ...payload } = form;
    void _discard;
    await onSave({
      ...payload,
      // Dias explícitos só valem na jornada personalizada; nos demais
      // tipos o campo é limpo para não gerar regra fantasma.
      workdays: form.scheduleType === "CUSTOM" ? form.workdays : null,
      jobTitle: form.jobTitle?.trim() ? form.jobTitle.trim() : null,
      admissionDate: form.admissionDate || null,
      terminationDate: form.terminationDate || null
    }, editing?.id);
    setEditing(null);
    setFormOpen(false);
    setForm({ ...EMPTY_FORM, workdays: null, jobTitle: null });
  }

  // --- Códigos de acesso ao portal (RH) ---
  const [codeBusy, setCodeBusy] = useState("");
  const [codeError, setCodeError] = useState("");
  const [singleCode, setSingleCode] = useState<{ employeeName: string; code: string } | null>(null);
  const [batchCodes, setBatchCodes] = useState<Array<{ employeeId: string; employeeName: string; code: string }> | null>(null);
  const [delivered, setDelivered] = useState<Record<string, boolean>>({});
  const [revokeTarget, setRevokeTarget] = useState<Employee | null>(null);
  const [inactivateTarget, setInactivateTarget] = useState<Employee | null>(null);

  async function confirmInactivate() {
    if (!inactivateTarget) return;
    const employee = inactivateTarget;
    setInactivateTarget(null);
    await onInactivate(employee.id);
  }

  async function generateCode(employee: Employee) {
    setCodeBusy(employee.id);
    setCodeError("");
    try {
      const result = await api.setEmployeeAccessCode(token, employee.id);
      setSingleCode({ employeeName: result.employeeName, code: result.code });
      await onReload();
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "Não foi possível gerar o código.");
    } finally {
      setCodeBusy("");
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    const employee = revokeTarget;
    setRevokeTarget(null);
    setCodeBusy(employee.id);
    setCodeError("");
    try {
      await api.revokeEmployeeAccessCode(token, employee.id);
      toast.success(`Acesso de ${employee.name} revogado.`);
      await onReload();
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "Não foi possível revogar o acesso.");
    } finally {
      setCodeBusy("");
    }
  }

  async function generateBatch() {
    setCodeBusy("batch");
    setCodeError("");
    try {
      const result = await api.batchEmployeeAccessCodes(token);
      if (result.count === 0) {
        setCodeError("Ninguém pendente: todos os ativos já têm código.");
        return;
      }
      setBatchCodes(result.issued);
      setDelivered({});
      await onReload();
    } catch (error) {
      setCodeError(error instanceof Error ? error.message : "Não foi possível gerar os códigos.");
    } finally {
      setCodeBusy("");
    }
  }

  return (
    <>
      <Panel>
        <PanelHeader>
          <div>
            <h2>Funcionários</h2>
            <p>{activeCount} ativos · {employees.length - activeCount} inativos</p>
          </div>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => void generateBatch()} disabled={codeBusy === "batch"}>
                <KeyRound size={17} />
                {codeBusy === "batch" ? "Gerando..." : "Gerar códigos"}
              </Button>
              <Button type="button" onClick={openNew}>
                <Plus size={17} />
                Novo funcionário
              </Button>
            </div>
          )}
        </PanelHeader>
        <div className="relative mb-3">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nome ou função…"
            aria-label="Buscar funcionário"
            className="min-h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-ink focus:border-teal focus:outline-none"
          />
        </div>
        {canEdit && (
          <p className="mb-3 text-[0.86rem] font-bold text-muted">
            Códigos de acesso: gere por pessoa ou todos os pendentes de uma vez. A lista aparece uma única vez.
          </p>
        )}
        {codeError && <p className="mb-3 rounded-lg border border-danger/30 bg-danger/5 p-[10px_12px] font-extrabold text-danger-ink">{codeError}</p>}
        <DataTable>
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Jornada</th>
              <th>Status</th>
              <th>Acesso portal</th>
              {canEdit && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {visibleEmployees.length === 0 && (
              <tr>
                <td colSpan={canEdit ? 5 : 4} className="text-muted">
                  Nenhum funcionário encontrado para o filtro informado.
                </td>
              </tr>
            )}
            {visibleEmployees.map((employee) => (
              <tr key={employee.id} className={employee.status === "ACTIVE" ? "" : "opacity-70"}>
                <td>
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="grid h-10 w-10 flex-none place-items-center rounded-full bg-teal-bg text-sm font-black text-teal-deep"
                    >
                      {initials(employee.name)}
                    </span>
                    <span className="min-w-0">
                      <strong className="block truncate">{employee.name}</strong>
                      <span className="block truncate text-[0.82rem] text-muted">
                        {employee.jobTitle?.trim() ? employee.jobTitle : "Sem função definida"}
                      </span>
                    </span>
                  </div>
                </td>
                <td>
                  {scheduleLabels[employee.scheduleType]}
                  {workdayLabel(employee.workdays) ? ` (${workdayLabel(employee.workdays)})` : ""}
                </td>
                <td><Badge variant={employee.status === "ACTIVE" ? "good" : "muted"}>{statusLabels[employee.status]}</Badge></td>
                <td>
                  <span className="flex flex-col items-start gap-1">
                    <Badge variant={accessBadgeVariant(employee.portalAccess)}>
                      {accessLabel(employee.portalAccess)}
                    </Badge>
                    <span className="text-xs text-muted">{lastAccessLabel(employee.lastPortalAccessAt)}</span>
                  </span>
                </td>
                {canEdit && (
                  <td>
                    <div className="flex gap-1">
                      <Button type="button" size="icon" title={`Editar ${employee.name}`} aria-label={`Editar ${employee.name}`} onClick={() => startEdit(employee)}>
                        <Pencil size={16} />
                      </Button>
                      <Button type="button" size="icon" variant="outline" title={`Inativar ${employee.name}`} aria-label={`Inativar ${employee.name}`} onClick={() => setInactivateTarget(employee)}>
                        <UserX size={16} />
                      </Button>
                      <Button type="button" size="icon" variant="outline" title={employee.hasAccessCode ? `Reemitir código de ${employee.name}` : `Gerar código de ${employee.name}`} aria-label={employee.hasAccessCode ? `Reemitir código de ${employee.name}` : `Gerar código de ${employee.name}`} onClick={() => void generateCode(employee)} disabled={codeBusy === employee.id}>
                        <KeyRound size={16} />
                      </Button>
                      {employee.hasAccessCode && (
                        <Button type="button" size="icon" variant="outline" title={`Revogar acesso de ${employee.name}`} aria-label={`Revogar acesso de ${employee.name}`} onClick={() => setRevokeTarget(employee)} disabled={codeBusy === employee.id}>
                          <Ban size={16} />
                        </Button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) { setFormOpen(false); setEditing(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${editing.name}` : "Novo funcionário"}</DialogTitle>
            <DialogDescription>
              {editing ? "Ajuste os dados cadastrais. O código de acesso não muda aqui." : "Cadastre nome, função e jornada. O código de acesso é gerado depois, na lista."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit}>
            <div className="grid gap-3">
              <Field>
                <label htmlFor="employee-name">Nome</label>
                <input id="employee-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </Field>
              <Field>
                <label htmlFor="employee-job">Função (opcional)</label>
                <input
                  id="employee-job"
                  value={form.jobTitle ?? ""}
                  maxLength={60}
                  onChange={(event) => setForm({ ...form, jobTitle: event.target.value })}
                  placeholder="Ex.: Cozinheira"
                />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <label htmlFor="employee-status">Status</label>
                  <select id="employee-status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EmployeeStatus })}>
                    <option value="ACTIVE">Ativo</option>
                    <option value="INACTIVE">Inativo</option>
                  </select>
                </Field>
                <Field>
                  <label htmlFor="employee-schedule">Jornada</label>
                  <select id="employee-schedule" value={form.scheduleType} onChange={(event) => setForm({ ...form, scheduleType: event.target.value as ScheduleType })}>
                    <option value="MON_FRI">Seg-Sex</option>
                    <option value="MON_SUN">Seg-Dom</option>
                    <option value="CUSTOM">Personalizada</option>
                  </select>
                </Field>
              </div>
              {form.scheduleType === "CUSTOM" && (
                <Field>
                  <label>Dias esperados</label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((day) => {
                      const active = form.workdays?.includes(day.value) ?? false;
                      return (
                        <label
                          key={day.value}
                          className={cn(
                            "inline-flex min-h-11 cursor-pointer items-center gap-[6px] rounded-lg border px-3 py-2 font-extrabold text-ink",
                            active ? "border-teal bg-teal-bg" : "border-line bg-surface"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggleWorkday(day.value)}
                            aria-label={`Esperado às ${day.label}s`}
                            className="h-[18px] w-[18px] accent-teal-deep"
                          />
                          {day.label}
                        </label>
                      );
                    })}
                  </div>
                </Field>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field>
                  <label htmlFor="employee-admission">Admissão</label>
                  <input id="employee-admission" type="date" value={form.admissionDate ?? ""} onChange={(event) => setForm({ ...form, admissionDate: event.target.value })} />
                </Field>
                <Field>
                  <label htmlFor="employee-termination">Desligamento</label>
                  <input id="employee-termination" type="date" value={form.terminationDate ?? ""} onChange={(event) => setForm({ ...form, terminationDate: event.target.value })} />
                </Field>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setFormOpen(false); setEditing(null); }}>
                Cancelar
              </Button>
              <Button type="submit">
                <Save size={17} />
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={singleCode !== null} onOpenChange={(open) => { if (!open) setSingleCode(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código de {singleCode?.employeeName}</DialogTitle>
            <DialogDescription>
              Anote e entregue pessoalmente. Este código <strong>não será exibido de novo</strong> — se perder, reemita.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-dashed border-teal bg-teal-bg p-3 text-center text-[2.2rem] font-black tracking-[0.35em]">
            {singleCode?.code}
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                if (singleCode) void navigator.clipboard?.writeText(singleCode.code).catch(() => undefined);
              }}
            >
              Copiar código
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={batchCodes !== null} onOpenChange={() => undefined}>
        <DialogContent className="max-w-[640px]" onInteractOutside={(event) => event.preventDefault()} onEscapeKeyDown={(event) => event.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Lista de distribuição — aparece uma única vez</DialogTitle>
            <DialogDescription>
              Imprima ou anote e entregue dentro da empresa. Marque "entregue" por linha e encerre — depois só reemissão.
            </DialogDescription>
          </DialogHeader>
          <DataTable>
            <thead>
              <tr>
                <th>Funcionário</th>
                <th>Código</th>
                <th>Entregue</th>
              </tr>
            </thead>
            <tbody>
              {(batchCodes ?? []).map((item) => (
                <tr key={item.employeeId}>
                  <td>{item.employeeName}</td>
                  <td><span className="text-[1.2rem] font-black tracking-[0.35em]">{item.code}</span></td>
                  <td>
                    <Checkbox
                      checked={delivered[item.employeeId] ?? false}
                      onCheckedChange={() => setDelivered((current) => ({ ...current, [item.employeeId]: !current[item.employeeId] }))}
                      aria-label={`Código entregue a ${item.employeeName}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              Imprimir lista
            </Button>
            <Button type="button" onClick={() => setBatchCodes(null)}>
              Encerrar distribuição (some da tela)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeTarget !== null} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revogar acesso</DialogTitle>
            <DialogDescription>
              Revogar o acesso de {revokeTarget?.name} ao portal? O código atual para de funcionar na hora.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={() => void confirmRevoke()}>
              Revogar acesso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={inactivateTarget !== null} onOpenChange={(open) => { if (!open) setInactivateTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inativar funcionário?</DialogTitle>
            <DialogDescription>
              Inativar <strong>{inactivateTarget?.name}</strong>? O histórico é preservado e o acesso ao portal é mantido conforme o código (revogue separadamente se preciso).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInactivateTarget(null)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={() => void confirmInactivate()}>
              Inativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
