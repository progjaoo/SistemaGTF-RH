export type Role = "RH" | "GESTORA";
export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type ScheduleType = "MON_FRI" | "MON_SUN" | "CUSTOM";
export type BillingStatus = "OPEN" | "CLOSED";
export type ConfirmationStatus = "PENDING" | "PEGUEI" | "NAO_PEGUEI";
export type ConfirmationSource = "SISTEMA" | "WHATSAPP";

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
};

export type Employee = {
  id: string;
  name: string;
  status: EmployeeStatus;
  scheduleType: ScheduleType;
  // Dias esperados (0=dom..6=sáb). Null = segue o scheduleType.
  workdays: number[] | null;
  // True = colaborador tem código de acesso ao portal (hash nunca trafega).
  hasAccessCode: boolean;
  admissionDate: string | null;
  terminationDate: string | null;
};

export type MealPrice = {
  id: string;
  value: number;
  validFrom: string;
  validTo: string | null;
  employeeId: string | null;
  employee: Pick<Employee, "id" | "name"> | null;
};

export type MealRecord = {
  id: string;
  employeeId: string;
  periodId: string;
  date: string;
  quantity: number;
  confirmationStatus: ConfirmationStatus;
  confirmationSource: ConfirmationSource | null;
  confirmedAt: string | null;
  registeredById: string;
};

export type BillingPeriod = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: BillingStatus;
  totalAmount: number | null;
};

export type EmployeeTotal = {
  employeeId: string;
  employeeName: string;
  quantity: number;
  amount: number;
  unitPrices: number[];
};

export type DailyTotal = {
  date: string;
  quantity: number;
  amount: number;
};

export type PeriodSummary = {
  period: BillingPeriod;
  totalQuantity: number;
  totalAmount: number;
  employeeTotals: EmployeeTotal[];
  dailyTrend: DailyTotal[];
};

export type DashboardSummary = {
  current: PeriodSummary;
  previous: Pick<PeriodSummary, "period" | "totalAmount" | "totalQuantity"> | null;
  amountDelta: number | null;
  quantityDelta: number | null;
};

export type Session = {
  token: string;
  user: Pick<User, "id" | "name" | "email" | "role">;
};

export type ApiWarning = {
  employeeId: string;
  employeeName: string;
  date: string;
  message: string;
};

export type EmployeePortalSearchResult = Pick<Employee, "id" | "name"> & {
  // False = sem código ativado (procure o RH). Nunca expõe hash.
  hasAccess: boolean;
};

export type EmployeePortalDay = {
  id: string;
  date: string;
  quantity: number;
  confirmationStatus: ConfirmationStatus;
  confirmationSource: ConfirmationSource | null;
  confirmationNote: string | null;
  isLate: boolean;
  confirmedAt: string | null;
  period: Pick<BillingPeriod, "id" | "label" | "status">;
};

export type MealRecordConfirmation = {
  employeeId: string;
  employeeName: string;
  date: string;
  quantity: number;
  confirmationStatus: ConfirmationStatus;
  confirmationSource: ConfirmationSource | null;
  confirmationNote: string | null;
  confirmedAt: string | null;
};

export type MealConfirmationRealtimePayload = {
  periodId: string;
  confirmation: MealRecordConfirmation;
};

export type ImportPreviewRow = {
  index: number;
  name: string;
  date: string;
  quantity: number;
  status: "ok" | "error";
  message?: string;
  employeeId?: string;
  employeeName?: string;
};

export type ImportResult = {
  records: MealRecord[];
  warnings: ApiWarning[];
  preview: ImportPreviewRow[];
  valid: boolean;
  invalidCount: number;
};
