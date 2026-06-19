export type Role = "RH" | "GESTORA";
export type EmployeeStatus = "ACTIVE" | "INACTIVE";
export type ScheduleType = "MON_FRI" | "MON_SUN" | "CUSTOM";
export type BillingStatus = "OPEN" | "CLOSED";

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
