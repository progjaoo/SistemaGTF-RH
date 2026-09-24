import type {
  ApiWarning,
  BillingPeriod,
  DashboardSummary,
  Employee,
  EmployeePortalDay,
  EmployeePortalSearchResult,
  MealPrice,
  MealRecord,
  MealRecordConfirmation,
  ConfirmationStatus,
  ImportResult,
  Role,
  Session,
  User
} from "./types";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3333/api";

export function getSocketConfig() {
  const url = new URL(API_BASE, window.location.origin);
  const path = `${url.pathname.replace(/\/$/, "")}/socket.io`;
  url.pathname = "";
  url.search = "";
  url.hash = "";

  return {
    url: url.toString().replace(/\/$/, ""),
    path
  };
}

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
  saveEmployee(token: string, payload: Omit<Employee, "id" | "hasAccessCode">, id?: string) {
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
  bulkYearPeriods(token: string, payload: { year: number; cutDay: number; labelPrefix?: string }) {
    return request<{ periods: BillingPeriod[] }>("/billing-periods/bulk-year", token, {
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
  importMealRecords(
    token: string,
    periodId: string,
    rows: Array<{ name?: string; employeeId?: string; date: string; quantity: number }>,
    dryRun: boolean
  ) {
    return request<ImportResult>("/meal-records/import", token, {
      method: "POST",
      body: JSON.stringify({ periodId, rows, dryRun })
    });
  },
  mealRecordConfirmations(token: string, periodId: string, date?: string) {
    const params = new URLSearchParams({ periodId });
    if (date) params.set("date", date);
    return request<{ confirmations: MealRecordConfirmation[] }>(`/meal-records/confirmations?${params.toString()}`, token);
  },
  employeePortalSearch(name: string) {
    return request<{ employees: EmployeePortalSearchResult[] }>(`/employee-portal/search?name=${encodeURIComponent(name)}`);
  },
  employeePortalLogin(employeeId: string, code: string) {
    return request<{ token: string; employee: EmployeePortalSearchResult }>(`/employee-portal/login`, undefined, {
      method: "POST",
      body: JSON.stringify({ employeeId, code })
    });
  },
  employeePortalCalendar(employeeId: string, month: string, portalToken: string) {
    return request<{ employee: EmployeePortalSearchResult; month: string; days: EmployeePortalDay[] }>(
      `/employee-portal/${employeeId}/calendar?month=${encodeURIComponent(month)}`,
      portalToken
    );
  },
  employeePortalCheckin(employeeId: string, date: string, status: Exclude<ConfirmationStatus, "PENDING">, portalToken: string, note?: string) {
    return request<{ record: EmployeePortalDay }>(`/employee-portal/${employeeId}/checkin`, portalToken, {
      method: "POST",
      body: JSON.stringify(note === undefined ? { date, status } : { date, status, note })
    });
  },
  setEmployeeAccessCode(token: string, employeeId: string, code?: string) {
    return request<{ employeeId: string; employeeName: string; code: string }>(
      `/employees/${employeeId}/access-code`,
      token,
      { method: "PUT", body: JSON.stringify(code ? { code } : {}) }
    );
  },
  revokeEmployeeAccessCode(token: string, employeeId: string) {
    return request<{ employeeId: string }>(`/employees/${employeeId}/access-code`, token, { method: "DELETE" });
  },
  batchEmployeeAccessCodes(token: string) {
    return request<{ issued: Array<{ employeeId: string; employeeName: string; code: string }>; count: number }>(
      "/employees/access-codes/batch",
      token,
      { method: "POST" }
    );
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
