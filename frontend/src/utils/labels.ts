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
