import { FormEvent, useState } from "react";
import { KeyRound, Save } from "lucide-react";
import styled from "styled-components";
import { api } from "../../api";
import { Badge, Button, DataTable, Field, FormGrid, InlineActions, Panel, PanelHeader, TwoColumn } from "../../components/ui";
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

  async function revokeCode(employee: Employee) {
    if (!window.confirm(`Revogar o acesso de ${employee.name} ao portal?`)) return;
    setCodeBusy(employee.id);
    setCodeError("");
    try {
      await api.revokeEmployeeAccessCode(token, employee.id);
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
                <WeekdayGrid>
                  {WEEKDAYS.map((day) => (
                    <WeekdayChip key={day.value} $active={form.workdays?.includes(day.value) ?? false}>
                      <input
                        type="checkbox"
                        checked={form.workdays?.includes(day.value) ?? false}
                        onChange={() => toggleWorkday(day.value)}
                        aria-label={`Esperado às ${day.label}s`}
                      />
                      {day.label}
                    </WeekdayChip>
                  ))}
                </WeekdayGrid>
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
          <AccessToolbar>
            <Button type="button" onClick={() => void generateBatch()} disabled={codeBusy === "batch"}>
              <KeyRound size={17} />
              {codeBusy === "batch" ? "Gerando..." : "Gerar códigos pendentes"}
            </Button>
            <span>Cria códigos para todos os ativos sem acesso. A lista aparece uma única vez.</span>
          </AccessToolbar>
        )}
        {codeError && <AccessError>{codeError}</AccessError>}
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
                <td><Badge $tone={employee.status === "ACTIVE" ? "good" : "muted"}>{statusLabels[employee.status]}</Badge></td>
                <td>
                  <Badge $tone={employee.hasAccessCode ? "good" : "muted"}>
                    {employee.hasAccessCode ? "Ativo" : "Pendente"}
                  </Badge>
                </td>
                {canEdit && (
                  <td>
                    <InlineActions>
                      <Button type="button" onClick={() => startEdit(employee)}>Editar</Button>
                      <Button type="button" $variant="ghost" onClick={() => onInactivate(employee.id)}>Inativar</Button>
                      {employee.hasAccessCode ? (
                        <>
                          <Button type="button" $variant="ghost" onClick={() => void generateCode(employee)} disabled={codeBusy === employee.id}>
                            <KeyRound size={16} />
                            Reemitir
                          </Button>
                          <Button type="button" $variant="ghost" onClick={() => void revokeCode(employee)} disabled={codeBusy === employee.id}>
                            Revogar
                          </Button>
                        </>
                      ) : (
                        <Button type="button" $variant="ghost" onClick={() => void generateCode(employee)} disabled={codeBusy === employee.id}>
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

      {singleCode && (
        <CodeOverlay onClick={() => setSingleCode(null)}>
          <CodeModal onClick={(event) => event.stopPropagation()}>
            <h3>Código de {singleCode.employeeName}</h3>
            <p>Anote e entregue pessoalmente. Este código <strong>não será exibido de novo</strong> — se perder, reemita.</p>
            <CodeValue>{singleCode.code}</CodeValue>
            <Button type="button" onClick={() => {
              void navigator.clipboard?.writeText(singleCode.code).catch(() => undefined);
            }}>
              Copiar código
            </Button>
            <Button type="button" $variant="ghost" onClick={() => setSingleCode(null)}>
              Fechar (não mostra mais)
            </Button>
          </CodeModal>
        </CodeOverlay>
      )}

      {batchCodes && (
        <CodeOverlay onClick={() => undefined}>
          <CodeModal $wide onClick={(event) => event.stopPropagation()}>
            <h3>Lista de distribuição — aparece uma única vez</h3>
            <p>Imprima ou anote e entregue dentro da empresa. Marque "entregue" por linha e encerre — depois só reemissão.</p>
            <DataTable>
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Código</th>
                  <th>Entregue</th>
                </tr>
              </thead>
              <tbody>
                {batchCodes.map((item) => (
                  <tr key={item.employeeId}>
                    <td>{item.employeeName}</td>
                    <td><CodeValue $inline>{item.code}</CodeValue></td>
                    <td>
                      <input
                        type="checkbox"
                        checked={delivered[item.employeeId] ?? false}
                        onChange={() => setDelivered((current) => ({ ...current, [item.employeeId]: !current[item.employeeId] }))}
                        aria-label={`Código entregue a ${item.employeeName}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
            <Button type="button" onClick={() => window.print()}>
              Imprimir lista
            </Button>
            <Button type="button" $variant="ghost" onClick={() => setBatchCodes(null)}>
              Encerrar distribuição (some da tela)
            </Button>
          </CodeModal>
        </CodeOverlay>
      )}
    </TwoColumn>
  );
}

const WeekdayGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const WeekdayChip = styled.label<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 8px 12px;
  border: 1px solid ${({ $active }) => ($active ? "var(--teal)" : "var(--line)")};
  border-radius: 8px;
  background: ${({ $active }) => ($active ? "var(--teal-soft)" : "#fff")};
  color: var(--ink);
  font-weight: 800;
  cursor: pointer;

  input {
    width: 18px;
    height: 18px;
    accent-color: var(--teal);
  }
`;

const AccessToolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;

  span {
    color: var(--muted);
    font-size: 0.86rem;
    font-weight: 700;
  }
`;

const AccessError = styled.p`
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #b91c1c;
  font-weight: 800;
`;

const CodeOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(15, 23, 42, 0.55);
`;

const CodeModal = styled.div<{ $wide?: boolean }>`
  display: grid;
  gap: 12px;
  width: min(${({ $wide }) => ($wide ? "640px" : "420px")}, 100%);
  max-height: 90vh;
  overflow: auto;
  padding: 22px;
  border-radius: 10px;
  background: var(--surface);
  box-shadow: var(--shadow);

  h3 {
    margin: 0;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.9rem;
  }
`;

const CodeValue = styled.div<{ $inline?: boolean }>`
  font-size: ${({ $inline }) => ($inline ? "1.2rem" : "2.2rem")};
  font-weight: 900;
  letter-spacing: 0.35em;
  text-align: center;
  padding: ${({ $inline }) => ($inline ? "0" : "12px")};
  border: ${({ $inline }) => ($inline ? "none" : "1px dashed var(--teal)")};
  border-radius: 8px;
  background: ${({ $inline }) => ($inline ? "transparent" : "var(--teal-soft)")};
`;
