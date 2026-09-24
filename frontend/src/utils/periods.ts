// Espelho client-side do gerador anual (backend/src/routes/billing-periods.ts).
// Só para PREVIEW — o servidor recalcula e valida sobreposição de verdade.
const MONTH_NAMES_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const pad2 = (value: number) => String(value).padStart(2, "0");

export type YearPreview = { label: string; startDate: string; endDate: string };

export function buildYearPreview(year: number, cutDay: number, labelPrefix: string): YearPreview[] {
  return MONTH_NAMES_PT.map((monthName, index) => {
    const month = index + 1;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    const endDay = cutDay - 1;
    const startDate = `${year}-${pad2(month)}-${pad2(cutDay)}`;
    const lastOfMonth = new Date(year, month, 0).getDate();
    const endDate = endDay >= 1
      ? `${nextYear}-${pad2(nextMonth)}-${pad2(endDay)}`
      : `${year}-${pad2(month)}-${pad2(lastOfMonth)}`;
    const endLabel = endDay >= 1 ? `${pad2(endDay)}/${pad2(nextMonth)}` : `${pad2(lastOfMonth)}/${pad2(month)}`;
    const prefix = labelPrefix.trim() ? `${labelPrefix.trim()} ` : "";
    return {
      label: `${prefix}${monthName} ${year} - ${pad2(cutDay)}/${pad2(month)} a ${endLabel}`,
      startDate,
      endDate
    };
  });
}
