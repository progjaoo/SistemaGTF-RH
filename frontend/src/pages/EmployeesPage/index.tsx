import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { Badge, Button, DataTable, Field, FormGrid, InlineActions, Panel, PanelHeader, TwoColumn } from "../../components/ui";
import type { Employee, EmployeeStatus, ScheduleType } from "../../types";
import { scheduleLabels, statusLabels } from "../../utils/labels";

export default function EmployeesPage({
  employees,
  canEdit,
  onSave,
  onInactivate
}: {
  employees: Employee[];
  canEdit: boolean;
  onSave: (payload: Omit<Employee, "id">, id?: string) => Promise<void>;
  onInactivate: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Omit<Employee, "id">>({
    name: "",
    status: "ACTIVE",
    scheduleType: "MON_FRI",
    admissionDate: "",
    terminationDate: ""
  });

  function startEdit(employee: Employee) {
    setEditing(employee);
    setForm({
      name: employee.name,
      status: employee.status,
      scheduleType: employee.scheduleType,
      admissionDate: employee.admissionDate ?? "",
      terminationDate: employee.terminationDate ?? ""
    });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ ...form, admissionDate: form.admissionDate || null, terminationDate: form.terminationDate || null }, editing?.id);
    setEditing(null);
    setForm({ name: "", status: "ACTIVE", scheduleType: "MON_FRI", admissionDate: "", terminationDate: "" });
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
        <DataTable>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Jornada</th>
              <th>Status</th>
              {canEdit && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr key={employee.id}>
                <td>{employee.name}</td>
                <td>{scheduleLabels[employee.scheduleType]}</td>
                <td><Badge $tone={employee.status === "ACTIVE" ? "good" : "muted"}>{statusLabels[employee.status]}</Badge></td>
                {canEdit && (
                  <td>
                    <InlineActions>
                      <Button type="button" onClick={() => startEdit(employee)}>Editar</Button>
                      <Button type="button" $variant="ghost" onClick={() => onInactivate(employee.id)}>Inativar</Button>
                    </InlineActions>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </TwoColumn>
  );
}
