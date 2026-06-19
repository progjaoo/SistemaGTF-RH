import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Info,
  Minus,
  Plus,
  Save,
  Search,
  Soup,
  X
} from "lucide-react";
import {
  BulkActions,
  DailyControls,
  DailyTotalCard,
  DateCard,
  DateNavButton,
  DateSummary,
  EmployeeCards,
  EmployeeIdentity,
  EmployeeInitials,
  EmployeeMealCard,
  InfoCard,
  QuantityButton,
  QuantityControl,
  QuantityValue,
  RecordsHero,
  RecordsLayout,
  RecordsMark,
  RecordsTitle,
  RecordsTools,
  RowWarning,
  SaveButton,
  SaveStatus,
  SearchField,
  SearchInputWrap,
  SortHint
} from "../../components/records/styles";
import { Button, EmptyState } from "../../components/ui";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import type { ApiWarning, BillingPeriod, Employee, MealPrice } from "../../types";
import { dateRange, fullDate, longDate, weekday } from "../../utils/date";
import { initials, normalizeSearch } from "../../utils/format";
import { scheduleLabels } from "../../utils/labels";
import { buildMealExportSummary, exportMealConferencePdf, exportMealSpreadsheet } from "../../utils/mealReport";

export default function RecordsPage({
  employees,
  prices,
  period,
  quantities,
  warnings,
  onChangeQuantity,
  onSave
}: {
  employees: Employee[];
  prices: MealPrice[];
  period: BillingPeriod;
  quantities: Record<string, number>;
  warnings: ApiWarning[];
  onChangeQuantity: (key: string, value: number) => void;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(period.startDate);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const debouncedSearch = useDebouncedValue(employeeSearch);
  const dates = useMemo(() => dateRange(period.startDate, period.endDate), [period.startDate, period.endDate]);
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.status === "ACTIVE"), [employees]);

  useEffect(() => {
    setSelectedDate(period.startDate);
  }, [period.id, period.startDate]);

  const selectedDateIndex = Math.max(0, dates.indexOf(selectedDate));
  const consumptionFrequency = useMemo(() => {
    const frequency = new Map<string, number>();
    for (const employee of activeEmployees) {
      frequency.set(employee.id, dates.reduce((sum, date) => sum + (quantities[`${employee.id}:${date}`] ?? 0), 0));
    }
    return frequency;
  }, [activeEmployees, dates, quantities]);
  const visibleEmployees = useMemo(() => {
    const query = normalizeSearch(debouncedSearch);
    return activeEmployees
      .filter((employee) => !query || normalizeSearch(employee.name).includes(query))
      .sort((first, second) => {
        const frequencyDelta = (consumptionFrequency.get(second.id) ?? 0) - (consumptionFrequency.get(first.id) ?? 0);
        if (frequencyDelta !== 0) return frequencyDelta;
        return first.name.localeCompare(second.name, "pt-BR", { sensitivity: "base" });
      });
  }, [activeEmployees, consumptionFrequency, debouncedSearch]);
  const dailyTotal = useMemo(
    () => activeEmployees.reduce((sum, employee) => sum + (quantities[`${employee.id}:${selectedDate}`] ?? 0), 0),
    [activeEmployees, quantities, selectedDate]
  );
  const warningsForDate = useMemo(
    () => warnings.filter((warning) => warning.date === selectedDate),
    [selectedDate, warnings]
  );
  const warningByEmployee = useMemo(() => {
    const map = new Map<string, ApiWarning>();
    for (const warning of warningsForDate) {
      map.set(warning.employeeId, warning);
    }
    return map;
  }, [warningsForDate]);
  const exportSummary = useMemo(
    () => buildMealExportSummary({ employees: visibleEmployees, dates, prices, quantities }),
    [dates, prices, quantities, visibleEmployees]
  );

  async function save() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  const readOnly = period.status === "CLOSED";
  const moveDate = (direction: -1 | 1) => {
    const nextDate = dates[selectedDateIndex + direction];
    if (nextDate) setSelectedDate(nextDate);
  };
  const changeDailyQuantity = (employee: Employee, nextValue: number) => {
    if (readOnly) return;
    const key = `${employee.id}:${selectedDate}`;
    onChangeQuantity(key, Math.max(0, Math.min(10, nextValue)));
  };
  const setVisibleQuantity = (quantity: number) => {
    if (readOnly || visibleEmployees.length === 0) return;
    for (const employee of visibleEmployees) {
      onChangeQuantity(`${employee.id}:${selectedDate}`, quantity);
    }
  };

  return (
    <RecordsLayout>
      <RecordsHero>
        <RecordsTitle>
          <RecordsMark>
            <Soup size={26} />
          </RecordsMark>
          <div>
            <h2>Registro de Refeições</h2>
            <p>{readOnly ? "Período fechado para consulta" : "Registre as refeições do dia"}</p>
          </div>
        </RecordsTitle>
        <SaveButton type="button" onClick={save} disabled={saving || readOnly}>
          <Save size={20} />
          {saving ? "Salvando..." : "Salvar"}
        </SaveButton>
      </RecordsHero>

      <DailyControls>
        <DateCard>
          <DateNavButton type="button" onClick={() => moveDate(-1)} disabled={selectedDateIndex === 0} aria-label="Dia anterior">
            <ChevronLeft size={22} />
          </DateNavButton>
          <DateSummary>
            <strong>{longDate(selectedDate)}</strong>
            <span>{weekday(selectedDate)}</span>
          </DateSummary>
          <DateNavButton type="button" onClick={() => moveDate(1)} disabled={selectedDateIndex === dates.length - 1} aria-label="Próximo dia">
            <ChevronRight size={22} />
          </DateNavButton>
        </DateCard>

        <InfoCard>
          <Info size={18} />
          <span>Informe a quantidade de refeições para cada colaborador neste dia.</span>
        </InfoCard>

        <DailyTotalCard>
          <span>Total do dia</span>
          <strong>{dailyTotal}</strong>
        </DailyTotalCard>
      </DailyControls>

      <RecordsTools>
        <SearchField>
          <label htmlFor="employee-search">Buscar funcionário</label>
          <SearchInputWrap>
            <Search size={18} />
            <input
              id="employee-search"
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
              placeholder="Filtrar por nome"
            />
          </SearchInputWrap>
        </SearchField>

        <BulkActions>
          <SortHint>{visibleEmployees.length} exibidos · Mais consumo primeiro, A-Z no empate</SortHint>
          <Button type="button" onClick={() => setVisibleQuantity(1)} disabled={readOnly || visibleEmployees.length === 0}>
            <CheckCircle2 size={17} />
            Marcar para todos os {visibleEmployees.length} exibidos
          </Button>
          <Button type="button" $variant="ghost" onClick={() => setVisibleQuantity(0)} disabled={readOnly || visibleEmployees.length === 0}>
            <X size={17} />
            Desmarcar exibidos
          </Button>
          <Button type="button" $variant="ghost" onClick={() => exportMealSpreadsheet(period, exportSummary)} disabled={visibleEmployees.length === 0}>
            <Download size={17} />
            Exportar planilha
          </Button>
          <Button type="button" $variant="ghost" onClick={() => exportMealConferencePdf(period, exportSummary)} disabled={visibleEmployees.length === 0}>
            <FileText size={17} />
            Gerar PDF
          </Button>
        </BulkActions>
      </RecordsTools>

      <EmployeeCards aria-label="Lançamentos por funcionário">
        {visibleEmployees.length === 0 && (
          <EmptyState>Nenhum funcionário encontrado para o filtro informado.</EmptyState>
        )}
        {visibleEmployees.map((employee) => {
          const quantity = quantities[`${employee.id}:${selectedDate}`] ?? 0;
          const warning = warningByEmployee.get(employee.id);

          return (
            <EmployeeMealCard key={employee.id} $warn={Boolean(warning)}>
              <EmployeeIdentity>
                <EmployeeInitials aria-hidden="true">{initials(employee.name)}</EmployeeInitials>
                <div>
                  <strong>{employee.name}</strong>
                  <span><CalendarCheck size={15} /> {scheduleLabels[employee.scheduleType]}</span>
                </div>
              </EmployeeIdentity>

              <QuantityControl aria-label={`Quantidade de refeições de ${employee.name} em ${fullDate(selectedDate)}`}>
                <QuantityButton
                  type="button"
                  onClick={() => changeDailyQuantity(employee, quantity - 1)}
                  disabled={readOnly || quantity <= 0}
                  aria-label={`Diminuir refeições de ${employee.name}`}
                >
                  <Minus size={20} />
                </QuantityButton>
                <QuantityValue>
                  <strong>{quantity}</strong>
                  <span>{quantity === 1 ? "refeição" : "refeições"}</span>
                </QuantityValue>
                <QuantityButton
                  type="button"
                  onClick={() => changeDailyQuantity(employee, quantity + 1)}
                  disabled={readOnly || quantity >= 10}
                  aria-label={`Aumentar refeições de ${employee.name}`}
                >
                  <Plus size={20} />
                </QuantityButton>
              </QuantityControl>

              {warning && (
                <RowWarning title={warning.message}>
                  <AlertTriangle size={22} />
                </RowWarning>
              )}
            </EmployeeMealCard>
          );
        })}
      </EmployeeCards>

      <SaveStatus>
        {warningsForDate.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
        <span>
          {warningsForDate.length > 0
            ? "Há quantidades fora do tipo de jornada programada para a data."
            : `Os registros são salvos apenas para ${fullDate(selectedDate)}.`}
        </span>
      </SaveStatus>
    </RecordsLayout>
  );
}
