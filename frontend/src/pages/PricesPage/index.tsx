import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Button, DataTable, Field, FormGrid, Panel, PanelHeader, TwoColumn } from "../../components/ui";
import type { Employee, MealPrice } from "../../types";
import { fullDate } from "../../utils/date";
import { formatCurrency } from "../../utils/format";

export default function PricesPage({
  prices,
  employees,
  onSave
}: {
  prices: MealPrice[];
  employees: Employee[];
  onSave: (payload: { value: number; validFrom: string; validTo?: string | null; employeeId?: string | null }) => Promise<void>;
}) {
  const [value, setValue] = useState("8.50");
  const [validFrom, setValidFrom] = useState("2026-06-01");
  const [employeeId, setEmployeeId] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ value: Number(value), validFrom, employeeId: employeeId || null });
    setEmployeeId("");
  }

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <h2>Novo preço</h2>
        </PanelHeader>
        <FormGrid onSubmit={submit}>
          <Field>
            <label>Valor</label>
            <input type="number" step="0.01" min="0.01" value={value} onChange={(event) => setValue(event.target.value)} required />
          </Field>
          <Field>
            <label>Vigência inicial</label>
            <input type="date" value={validFrom} onChange={(event) => setValidFrom(event.target.value)} required />
          </Field>
          <Field>
            <label>Funcionário</label>
            <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
              <option value="">Preço global</option>
              {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name}</option>)}
            </select>
          </Field>
          <Button type="submit">
            <Plus size={17} />
            Cadastrar
          </Button>
        </FormGrid>
      </Panel>

      <Panel>
        <PanelHeader>
          <h2>Histórico de preços</h2>
        </PanelHeader>
        <DataTable>
          <thead>
            <tr>
              <th>Escopo</th>
              <th>Vigência</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price) => (
              <tr key={price.id}>
                <td>{price.employee?.name ?? "Global"}</td>
                <td>{fullDate(price.validFrom)}</td>
                <td>{formatCurrency(price.value)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </TwoColumn>
  );
}
