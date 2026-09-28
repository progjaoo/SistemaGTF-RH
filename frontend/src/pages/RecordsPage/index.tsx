import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  Minus,
  Plus,
  Save,
  Search,
  Soup,
  X
} from "lucide-react";
import { toast } from "sonner";
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
import { api, ApiError } from "../../api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable, EmptyState, Panel, PanelHeader } from "../../components/ui";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useMealConfirmationRealtime } from "../../hooks/useMealConfirmationRealtime";
import type { ApiWarning, BillingPeriod, Employee, MealConfirmationRealtimePayload, MealRecordConfirmation } from "../../types";
import { dateKeyInSaoPaulo, dateRange, fullDate, longDate, weekday } from "../../utils/date";
import { initials, normalizeSearch } from "../../utils/format";
import { scheduleLabels } from "../../utils/labels";

export default function RecordsPage({
  token,
  employees,
  period,
  quantities,
  warnings,
  onChangeQuantity,
  onSave
}: {
  token: string;
  employees: Employee[];
  period: BillingPeriod;
  quantities: Record<string, number>;
  warnings: ApiWarning[];
  onChangeQuantity: (key: string, value: number) => void;
  onSave: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [loadingConfirmations, setLoadingConfirmations] = useState(false);
  const [confirmationScope, setConfirmationScope] = useState<"DAY" | "PERIOD" | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PEGUEI" | "NAO_PEGUEI" | "PENDING">("ALL");
  const [confirmationError, setConfirmationError] = useState("");
  const [confirmations, setConfirmations] = useState<MealRecordConfirmation[]>([]);
  const [dayClosed, setDayClosed] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [dayBusy, setDayBusy] = useState(false);
  const [closeBlockers, setCloseBlockers] = useState<{ pending: string[]; missing: string[] } | null>(null);
  const statusCounts = useMemo(() => ({
    ALL: confirmations.length,
    PEGUEI: confirmations.filter((c) => c.confirmationStatus === "PEGUEI").length,
    NAO_PEGUEI: confirmations.filter((c) => c.confirmationStatus === "NAO_PEGUEI").length,
    PENDING: confirmations.filter((c) => c.confirmationStatus === "PENDING").length,
  }), [confirmations]);
  const visibleConfirmations = confirmationScope && statusFilter === "ALL"
    ? confirmations
    : confirmations.filter((c) => c.confirmationStatus === statusFilter);
  const [selectedDate, setSelectedDate] = useState(period.startDate);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const debouncedSearch = useDebouncedValue(employeeSearch);
  const dates = useMemo(() => dateRange(period.startDate, period.endDate), [period.startDate, period.endDate]);
  const activeEmployees = useMemo(() => employees.filter((employee) => employee.status === "ACTIVE"), [employees]);

  useEffect(() => {
    const today = dateKeyInSaoPaulo();
    if (today >= period.startDate && today <= period.endDate) {
      setSelectedDate(today);
      return;
    }

    setSelectedDate(today > period.endDate ? period.endDate : period.startDate);
  }, [period.id, period.endDate, period.startDate]);

  useEffect(() => {
    let active = true;
    setCloseBlockers(null);
    api.dayStatus(token, selectedDate)
      .then((response) => {
        if (active) setDayClosed(response.closed);
      })
      .catch(() => {
        if (active) setDayClosed(false);
      });
    return () => {
      active = false;
    };
  }, [token, selectedDate]);

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

  async function save() {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  }

  const readOnly = period.status === "CLOSED";
  const today = dateKeyInSaoPaulo();
  const selectedDateIsFuture = selectedDate > today;
  const locked = readOnly || dayClosed || selectedDateIsFuture;
  const moveDate = (direction: -1 | 1) => {
    const nextDate = dates[selectedDateIndex + direction];
    if (nextDate) setSelectedDate(nextDate);
  };
  const changeDailyQuantity = (employee: Employee, nextValue: number) => {
    if (locked) return;
    const key = `${employee.id}:${selectedDate}`;
    onChangeQuantity(key, Math.max(0, Math.min(10, nextValue)));
  };
  const setVisibleQuantity = (quantity: number) => {
    if (locked || visibleEmployees.length === 0) return;
    for (const employee of visibleEmployees) {
      onChangeQuantity(`${employee.id}:${selectedDate}`, quantity);
    }
  };
  const loadConfirmations = async (scope: "DAY" | "PERIOD") => {
    setLoadingConfirmations(true);
    setConfirmationScope(scope);
    setConfirmationError("");
    try {
      const response = await api.mealRecordConfirmations(token, period.id, scope === "DAY" ? selectedDate : undefined);
      setConfirmations(response.confirmations);
    } catch (error) {
      setConfirmationError(error instanceof Error ? error.message : "Não foi possível carregar confirmações.");
    } finally {
      setLoadingConfirmations(false);
    }
  };
  async function handleCloseDay() {
    setDayBusy(true);
    setCloseBlockers(null);
    try {
      await api.closeDay(token, selectedDate);
      toast.success(`Dia ${fullDate(selectedDate)} fechado.`);
      setDayClosed(true);
      if (confirmationScope) await loadConfirmations(confirmationScope);
    } catch (error) {
      const body = error instanceof ApiError && error.body !== null && typeof error.body === "object"
        ? error.body as { pending?: unknown; missing?: unknown }
        : null;
      const pending = Array.isArray(body?.pending) ? (body.pending as string[]) : [];
      const missing = Array.isArray(body?.missing) ? (body.missing as string[]) : [];
      if (pending.length > 0 || missing.length > 0) {
        setCloseBlockers({ pending, missing });
        await loadConfirmations("DAY");
      }
      toast.error(error instanceof Error ? error.message : "Não foi possível fechar o dia.");
    } finally {
      setDayBusy(false);
    }
  }
  async function handleReopenDay() {
    setDayBusy(true);
    try {
      await api.reopenDay(token, selectedDate);
      toast.success(`Dia ${fullDate(selectedDate)} reaberto.`);
      setDayClosed(false);
      setReopenOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível reabrir o dia.");
    } finally {
      setDayBusy(false);
    }
  }
  const applyRealtimeConfirmation = useCallback((payload: MealConfirmationRealtimePayload) => {
    const nextConfirmation = payload.confirmation;
    if (confirmationScope === "DAY" && nextConfirmation.date !== selectedDate) return;

    setConfirmations((currentConfirmations) => {
      const currentIndex = currentConfirmations.findIndex(
        (confirmation) => confirmation.employeeId === nextConfirmation.employeeId && confirmation.date === nextConfirmation.date
      );

      const nextConfirmations =
        currentIndex >= 0
          ? currentConfirmations.map((confirmation, index) => (index === currentIndex ? nextConfirmation : confirmation))
          : [...currentConfirmations, nextConfirmation];

      return nextConfirmations.sort((first, second) => {
        if (first.date !== second.date) return first.date.localeCompare(second.date);
        return first.employeeName.localeCompare(second.employeeName, "pt-BR", { sensitivity: "base" });
      });
    });
  }, [confirmationScope, selectedDate]);

  useMealConfirmationRealtime({
    token,
    periodId: period.id,
    enabled: Boolean(confirmationScope),
    onConfirmation: applyRealtimeConfirmation
  });

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
        <SaveButton type="button" onClick={save} disabled={saving || locked}>
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
          <span>A quantidade é ajuste da gestora — no fechamento vale a confirmação (Peguei). Marque o WhatsApp na conferência.</span>
        </InfoCard>

        <DailyTotalCard>
          <span>Total do dia</span>
          <strong>{dailyTotal}</strong>
        </DailyTotalCard>

        <div className="col-span-full flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-[14px_16px] shadow-[0_18px_48px_rgb(32_38_44/0.08)]">
          <Badge variant={dayClosed ? "muted" : "good"}>{dayClosed ? "Dia fechado" : "Dia aberto"}</Badge>
          <span className="text-[0.9rem] font-bold text-muted">Situação de {fullDate(selectedDate)}</span>
          <span className="flex-1" />
          <Button type="button" variant="outline" onClick={() => void handleCloseDay()} disabled={dayBusy || readOnly || selectedDateIsFuture || dayClosed}>
            {dayBusy ? "Fechando..." : "Fechar o dia"}
          </Button>
          {dayClosed && (
            <Button type="button" variant="outline" onClick={() => setReopenOpen(true)}>
              Reabrir dia
            </Button>
          )}
        </div>

        {closeBlockers && (
          <div className="col-span-full">
            <EmptyState>
              <p className="font-bold">Não foi possível fechar o dia. Resolva na conferência abaixo:</p>
              {closeBlockers.pending.length > 0 && (
                <p>Pendentes: {closeBlockers.pending.join(", ")}</p>
              )}
              {closeBlockers.missing.length > 0 && (
                <p>Sem marcação: {closeBlockers.missing.join(", ")}</p>
              )}
            </EmptyState>
          </div>
        )}
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
          <Button type="button" onClick={() => setVisibleQuantity(1)} disabled={locked || visibleEmployees.length === 0}>
            <CheckCircle2 size={17} />
            Marcar para todos os {visibleEmployees.length} exibidos
          </Button>
          <Button type="button" variant="outline" onClick={() => setVisibleQuantity(0)} disabled={locked || visibleEmployees.length === 0}>
            <X size={17} />
            Desmarcar exibidos
          </Button>
          <Button type="button" variant="outline" onClick={() => loadConfirmations("DAY")} disabled={loadingConfirmations}>
            <ClipboardCheck size={17} />
            Verificar quem Pegou
          </Button>
        </BulkActions>
      </RecordsTools>

      {confirmationScope && (
        <Panel>
          <PanelHeader>
            <div>
              <h2>Verificar quem Pegou</h2>
              <p>
                {confirmationScope === "DAY" ? `Conferência de ${fullDate(selectedDate)}` : "Conferência do período inteiro"}
                {" · Atualiza automaticamente"}
              </p>
            </div>
            <div className="min-[521px]:contents max-[520px]:w-full">
              <BulkActions>
                <Button type="button" variant={confirmationScope === "DAY" ? "primary" : "outline"} onClick={() => loadConfirmations("DAY")} disabled={loadingConfirmations}>
                  Dia atual
                </Button>
                <Button type="button" variant={confirmationScope === "PERIOD" ? "primary" : "outline"} onClick={() => loadConfirmations("PERIOD")} disabled={loadingConfirmations}>
                  Período inteiro
                </Button>
                <Button type="button" variant="outline" onClick={() => setConfirmationScope(null)}>
                  Fechar
                </Button>
              </BulkActions>
            </div>
          </PanelHeader>

          {confirmationError && <EmptyState>{confirmationError}</EmptyState>}
          {!confirmationError && loadingConfirmations && <EmptyState>Carregando confirmações...</EmptyState>}
          {!confirmationError && !loadingConfirmations && (
            <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por status">
              {(["ALL", "PEGUEI", "NAO_PEGUEI", "PENDING"] as const).map((s) => (
                <Button key={s} type="button" size="sm" variant={statusFilter === s ? "primary" : "outline"}
                  aria-pressed={statusFilter === s} onClick={() => setStatusFilter(s)}>
                  {s === "ALL" ? "Todos" : s === "PEGUEI" ? "Pegou" : s === "NAO_PEGUEI" ? "Não pegou" : "Pendente"} ({statusCounts[s]})
                </Button>
              ))}
            </div>
          )}
          {!confirmationError && !loadingConfirmations && visibleConfirmations.length === 0 && (
            <EmptyState>Nenhum registro com este status na conferência selecionada.</EmptyState>
          )}
          {!confirmationError && !loadingConfirmations && visibleConfirmations.length > 0 && (
            <DataTable>
              <thead>
                <tr>
                  <th>Funcionário</th>
                  <th>Data</th>
                  <th>Qtd.</th>
                  <th>Status</th>
                  <th>Origem</th>
                  <th>Observação</th>
                  <th>Marcar</th>
                </tr>
              </thead>
              <tbody>
                {visibleConfirmations.map((confirmation) => (
                  <tr key={`${confirmation.employeeId}:${confirmation.date}`}>
                    <td>{confirmation.employeeName}</td>
                    <td>{fullDate(confirmation.date)}</td>
                    <td>{confirmation.quantity}</td>
                    <td>
                      <Badge variant={confirmation.confirmationStatus === "PEGUEI" ? "good" : confirmation.confirmationStatus === "NAO_PEGUEI" ? "warn" : "muted"}>
                        {confirmation.confirmationStatus === "PEGUEI" ? "Peguei" : confirmation.confirmationStatus === "NAO_PEGUEI" ? "Não peguei" : "Pendente"}
                      </Badge>
                    </td>
                    <td>{confirmation.confirmationSource === "SISTEMA" ? "Sistema" : confirmation.confirmationSource === "WHATSAPP" ? "WhatsApp" : "Sem confirmação"}</td>
                    <td>{confirmation.confirmationNote ?? "—"}</td>
                    <td>
                      <div className="flex gap-1 whitespace-nowrap">
                        <Button type="button" size="sm" title="Marcar pegou (WhatsApp)" disabled={locked} onClick={async () => { await api.setConfirmation(token, { employeeId: confirmation.employeeId, date: confirmation.date, status: "PEGUEI" }); await loadConfirmations(confirmationScope ?? "DAY"); }}>
                          Pegou
                        </Button>
                        <Button type="button" size="sm" variant="outline" title="Marcar não pegou (WhatsApp)" disabled={locked} onClick={async () => { await api.setConfirmation(token, { employeeId: confirmation.employeeId, date: confirmation.date, status: "NAO_PEGUEI" }); await loadConfirmations(confirmationScope ?? "DAY"); }}>
                          Não
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </Panel>
      )}

      <EmployeeCards aria-label="Lançamentos por funcionário">
        {visibleEmployees.length === 0 && (
          <EmptyState>Nenhum funcionário encontrado para o filtro informado.</EmptyState>
        )}
        {visibleEmployees.map((employee) => {
          const quantity = quantities[`${employee.id}:${selectedDate}`] ?? 0;
          const warning = warningByEmployee.get(employee.id);

          return (
            <EmployeeMealCard key={employee.id} warn={Boolean(warning)}>
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
                  disabled={locked || quantity <= 0}
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
                  disabled={locked || quantity >= 10}
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
            : selectedDateIsFuture
              ? "Datas futuras ficam bloqueadas para lançamento."
            : `Os registros são salvos apenas para ${fullDate(selectedDate)}.`}
        </span>
      </SaveStatus>

      <Dialog open={reopenOpen} onOpenChange={(open) => { if (!open) setReopenOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir dia</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja reabrir <strong>{fullDate(selectedDate)}</strong>? Os lançamentos voltarão a ficar editáveis.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReopenOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="danger" onClick={() => void handleReopenDay()} disabled={dayBusy}>
              Reabrir dia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </RecordsLayout>
  );
}
