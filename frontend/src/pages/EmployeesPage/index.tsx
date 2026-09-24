import { FormEvent, useState } from "react";
import { KeyRound, Save } from "lucide-react";
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
import { DataTable, Field, FormGrid, InlineActions, Panel, PanelHeader, TwoColumn } from "../../components/ui";
import { cn } from "@/lib/utils";
import type { Employee, EmployeeStatus, ScheduleType } from "../../types";
import { scheduleLabels, statusLabels, workdayLabel } from "../../utils/labels";

const WEEKDAYS = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" }
];

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
  onSave: (payload: Omit<Employee, "id" | "hasAccessCode">, id?: string) => Promise<void>;
  onInactivate: (id: string) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Omit<Employee, "id">>({
    name: "",
    status: "ACTIVE",
    scheduleType: "MON_FRI",
    workdays: null,
    hasAccessCode: false,
    admissionDate: "",
    terminationDate: ""
  });

  function toggleWorkday(day: number) {
    setForm((current) => {
      const selected = new Set(current.workdays ?? []);
      if (selected.has(day)) selected.delete(day);
      else selected.add(day);
      const sorted = [...selected].sort((a, b) => a - b);
      return { ...current, workdays: sorted.length > 0 ? sorted : null };
    });
  }

  function startEdit(employee: Employee) {
    setEditing(employee);
    setForm({
      name: employee.name,
      status: employee.status,
      scheduleType: employee.scheduleType,
      workdays: employee.workdays ?? null,
      hasAccessCode: employee.hasAccessCode,
      admissionDate: employee.admissionDate ?? "",
      terminationDate: employee.terminationDate ?? ""
    });
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
      admissionDate: form.admissionDate || null,
      terminationDate: form.terminationDate || null
    }, editing?.id);
    setEditing(null);
    setForm({ name: "", status: "ACTIVE", scheduleType: "MON_FRI", workdays: null, hasAccessCode: false, admissionDate: "", terminationDate: "" });
  }

  // --- Códigos de acesso ao portal (RH) ---
  const [codeBusy, setCodeBusy] = useState("");
  const [codeError, setCodeError] = useState("");
  const [singleCode, setSingleCode] = useState<{ employeeName: string; code: string } | null>(null);
  const [batchCodes, setBatchCodes] = useState<Array<{ employeeId: string; employeeName: string; code: string }> | null>(null);
  const [delivered, setDelivered] = useState<Record<string, boolean>>({});
  const [revokeTarget, setRevokeTarget] = useState<Employee | null>(null);

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
    <TwoColumn>
      {canEdit && (
        <Panel>
          <PanelHeader>
            <h2>{editing ? "Editar funcionário" : "Novo funcionário"}</h2>
          </PanelHeader>
          <FormGrid onSubmit={submit}>
            <Field>
              <label>Nome</label>
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </Field>
            <Field>
              <label>Status</label>
              <select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as EmployeeStatus })}>
                <option value="ACTIVE">Ativo</option>
                <option value="INACTIVE">Inativo</option>
              </select>
            </Field>
            <Field>
              <label>Jornada</label>
              <select value={form.scheduleType} onChange={(event) => setForm({ ...form, scheduleType: event.target.value as ScheduleType })}>
                <option value="MON_FRI">Seg-Sex</option>
                <option value="MON_SUN">Seg-Dom</option>
                <option value="CUSTOM">Personalizada</option>
              </select>
            </Field>
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
                          active ? "border-teal bg-teal-bg" : "border-line bg-white"
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
            <Field>
              <label>Admissão</label>
              <input type="date" value={form.admissionDate ?? ""} onChange={(event) => setForm({ ...form, admissionDate: event.target.value })} />
            </Field>
            <Field>
              <label>Desligamento</label>
              <input type="date" value={form.terminationDate ?? ""} onChange={(event) => setForm({ ...form, terminationDate: event.target.value })} />
            </Field>
            <Button type="submit">
              <Save size={17} />
              Salvar
            </Button>
          </FormGrid>
        </Panel>
      )}

      <Panel>
        <PanelHeader>
          <h2>Funcionários</h2>
        </PanelHeader>
        {canEdit && (
          <div className="mb-3 flex flex-wrap items-center gap-[10px] [&>span]:text-[0.86rem] [&>span]:font-bold [&>span]:text-muted">
            <Button type="button" onClick={() => void generateBatch()} disabled={codeBusy === "batch"}>
              <KeyRound size={17} />
              {codeBusy === "batch" ? "Gerando..." : "Gerar códigos pendentes"}
            </Button>
            <span>Cria códigos para todos os ativos sem acesso. A lista aparece uma única vez.</span>
          </div>
        )}
        {codeError && <p className="rounded-lg border border-danger/30 bg-danger/5 p-[10px_12px] font-extrabold text-danger-ink">{codeError}</p>}
        <DataTable>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Jornada</th>
              <th>Status</th>
              <th>Acesso portal</th>
              {canEdit && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>
                  {scheduleLabels[employee.scheduleType]}
                  {workdayLabel(employee.workdays) ? ` (${workdayLabel(employee.workdays)})` : ""}
                </td>
                <td><Badge variant={employee.status === "ACTIVE" ? "good" : "muted"}>{statusLabels[employee.status]}</Badge></td>
                <td>
                  <Badge variant={employee.hasAccessCode ? "good" : "muted"}>
                    {employee.hasAccessCode ? "Ativo" : "Pendente"}
                  </Badge>
                </td>
                {canEdit && (
                  <td>
                    <InlineActions>
                      <Button type="button" onClick={() => startEdit(employee)}>Editar</Button>
                      <Button type="button" variant="outline" onClick={() => onInactivate(employee.id)}>Inativar</Button>
                      {employee.hasAccessCode ? (
                        <>
                          <Button type="button" variant="outline" onClick={() => void generateCode(employee)} disabled={codeBusy === employee.id}>
                            <KeyRound size={16} />
                            Reemitir
                          </Button>
                          <Button type="button" variant="outline" onClick={() => setRevokeTarget(employee)} disabled={codeBusy === employee.id}>
                            Revogar
                          </Button>
                        </>
                      ) : (
                        <Button type="button" variant="outline" onClick={() => void generateCode(employee)} disabled={codeBusy === employee.id}>
                          <KeyRound size={16} />
                          Gerar código
                        </Button>
                      )}
                    </InlineActions>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>

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
    </TwoColumn>
  );
}
