import type {
  ApiWarning,
  BillingPeriod,
  DashboardSummary,
  Employee,
  MealPrice,
  MealRecord,
  Role,
  Session,
  User
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

async function request<T>(path: string, token?: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erro ao comunicar com a API." }));
    throw new Error(error.message ?? "Erro ao comunicar com a API.");
  }

  return response.json() as Promise<T>;
}

export const api = {
  login(email: string, password: string) {
    return request<Session>("/auth/login", undefined, {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  employees(token: string) {
    return request<{ employees: Employee[] }>("/employees", token);
  },
  saveEmployee(token: string, payload: Omit<Employee, "id">, id?: string) {
    return request<{ employee: Employee }>(id ? `/employees/${id}` : "/employees", token, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
  },
  inactivateEmployee(token: string, id: string) {
    return request<{ employee: Employee }>(`/employees/${id}`, token, { method: "DELETE" });
  },
  mealPrices(token: string) {
    return request<{ prices: MealPrice[] }>("/meal-prices", token);
  },
  createMealPrice(token: string, payload: { value: number; validFrom: string; validTo?: string | null; employeeId?: string | null }) {
    return request<{ price: MealPrice }>("/meal-prices", token, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  periods(token: string) {
    return request<{ periods: BillingPeriod[] }>("/billing-periods", token);
  },
  createPeriod(token: string, payload: Pick<BillingPeriod, "label" | "startDate" | "endDate">) {
    return request<{ period: BillingPeriod }>("/billing-periods", token, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  closePeriod(token: string, id: string) {
    return request<{ period: BillingPeriod }>(`/billing-periods/${id}/close`, token, { method: "POST" });
  },
  reopenPeriod(token: string, id: string) {
    return request<{ period: BillingPeriod }>(`/billing-periods/${id}/reopen`, token, { method: "POST" });
  },
  mealRecords(token: string, periodId: string) {
    return request<{ records: MealRecord[] }>(`/meal-records?periodId=${periodId}`, token);
  },
  saveMealRecords(token: string, periodId: string, entries: Array<{ employeeId: string; date: string; quantity: number }>) {
    return request<{ records: MealRecord[]; warnings: ApiWarning[] }>("/meal-records/bulk", token, {
      method: "POST",
      body: JSON.stringify({ periodId, entries })
    });
  },
  dashboard(token: string, periodId: string) {
    return request<{ summary: DashboardSummary }>(`/dashboard/summary?periodId=${periodId}`, token);
  },
  users(token: string) {
    return request<{ users: User[] }>("/users", token);
  },
  saveUser(token: string, payload: { name: string; email: string; password?: string; role: Role; active: boolean }, id?: string) {
    return request<{ user: User }>(id ? `/users/${id}` : "/users", token, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
  },
  async downloadReport(token: string, period: BillingPeriod) {
    const response = await fetch(`${API_BASE}/billing-periods/${period.id}/report?format=xlsx`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Não foi possível exportar o relatório.");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${period.label}.xlsx`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
};
