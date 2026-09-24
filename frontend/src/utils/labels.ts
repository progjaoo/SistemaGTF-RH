import type { EmployeeStatus, ScheduleType } from "../types";

export const scheduleLabels: Record<ScheduleType, string> = {
  MON_FRI: "Seg-Sex",
  MON_SUN: "Seg-Dom",
  CUSTOM: "Personalizada"
};

export const statusLabels: Record<EmployeeStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo"
};

const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

// "1,6" -> "Seg·Sáb". Null/vazio = segue o scheduleType (sem detalhe).
export function workdayLabel(workdays: number[] | null): string | null {
  if (!workdays || workdays.length === 0) return null;
  return [...workdays].sort((a, b) => a - b).map((day) => WEEKDAY_SHORT[day]).join("·");
}
