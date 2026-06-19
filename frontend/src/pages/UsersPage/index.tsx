import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { Badge, Button, CheckboxLabel, DataTable, Field, FormGrid, Panel, PanelHeader, TwoColumn } from "../../components/ui";
import type { Role, User } from "../../types";

export default function UsersPage({
  users,
  onSave
}: {
  users: User[];
  onSave: (payload: { name: string; email: string; password?: string; role: Role; active: boolean }, id?: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "GESTORA" as Role, active: true });

  function startEdit(user: User) {
    setEditing(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role, active: user.active });
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await onSave({ ...form, password: form.password || undefined }, editing?.id);
    setEditing(null);
    setForm({ name: "", email: "", password: "", role: "GESTORA", active: true });
  }

  return (
    <TwoColumn>
      <Panel>
        <PanelHeader>
          <h2>{editing ? "Editar usuário" : "Novo usuário"}</h2>
        </PanelHeader>
        <FormGrid onSubmit={submit}>
          <Field>
            <label>Nome</label>
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </Field>
          <Field>
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </Field>
          <Field>
            <label>Senha</label>
            <input type="password" minLength={editing ? 0 : 6} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required={!editing} />
          </Field>
          <Field>
            <label>Papel</label>
            <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as Role })}>
              <option value="RH">RH</option>
              <option value="GESTORA">Gestora</option>
            </select>
          </Field>
          <CheckboxLabel>
            <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
            Ativo
          </CheckboxLabel>
          <Button type="submit">
            <Save size={17} />
            Salvar
          </Button>
        </FormGrid>
      </Panel>

      <Panel>
        <PanelHeader>
          <h2>Usuários</h2>
        </PanelHeader>
        <DataTable>
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.role === "RH" ? "RH" : "Gestora"}</td>
                <td><Badge $tone={user.active ? "good" : "muted"}>{user.active ? "Ativo" : "Inativo"}</Badge></td>
                <td><Button type="button" onClick={() => startEdit(user)}>Editar</Button></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </TwoColumn>
  );
}
