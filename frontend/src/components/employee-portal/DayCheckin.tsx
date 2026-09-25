import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { ConfirmationStatus, EmployeePortalDay } from "../../types";
import { fullDate, weekday } from "../../utils/date";
import { cn } from "@/lib/utils";

// Painel de detalhe do dia selecionado no calendário.
// Regras (espelho visual; a API decide): hoje clica direto, passado exige
// justificativa, futuro nunca chega aqui (desabilitado na grade),
// confirmado/fechado são só leitura.
export function DayCheckin({
  day,
  selectedDate,
  today,
  saving,
  onCheckin
}: {
  day: EmployeePortalDay | undefined;
  selectedDate?: string | null;
  today: string;
  saving: boolean;
  onCheckin: (date: string, status: Exclude<ConfirmationStatus, "PENDING">, note?: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote("");
  }, [day?.id, selectedDate]);

  if (!day) {
    // Create-mode (self check-in): dia clicado sem lançamento do RH.
    // O colaborador registra direto — a API cria o MealRecord (qtd 1)
    // dentro do período OPEN. Futuro nunca chega aqui (grade desabilita).
    if (selectedDate && selectedDate <= today) {
      const late = selectedDate < today;
      const needNote = late;
      const canCreate = !saving && (!needNote || note.trim().length > 0);
      function create(status: Exclude<ConfirmationStatus, "PENDING">) {
        if (!canCreate || !selectedDate) return;
        onCheckin(selectedDate, status, note.trim() ? note.trim() : undefined);
      }
      return (
        <article className={cn("grid gap-3 rounded-lg border bg-white p-[14px]", late ? "border-[#f59e0b]" : "border-teal/25")}>
          <div className="grid gap-[3px]">
            <strong className="text-[1rem]">{fullDate(selectedDate)}</strong>
            <span className="text-[0.87rem] font-bold text-muted">
              {weekday(selectedDate)}
              {selectedDate === today ? " · HOJE" : ""}
              {late ? " · ATRASADO" : ""}
              {" · ainda não lançado"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 max-[420px]:grid-cols-1">
            <button
              type="button"
              disabled={!canCreate}
              title="Registrar que peguei"
              aria-label={`Registrar que peguei almoço em ${fullDate(selectedDate)}`}
              onClick={() => create("PEGUEI")}
              className="inline-flex min-h-11 items-center justify-center gap-[7px] rounded-lg border border-line bg-white px-[10px] py-[9px] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={18} />
              Peguei
            </button>
            <button
              type="button"
              disabled={!canCreate}
              title="Registrar que não peguei"
              aria-label={`Registrar que não peguei almoço em ${fullDate(selectedDate)}`}
              onClick={() => create("NAO_PEGUEI")}
              className="inline-flex min-h-11 items-center justify-center gap-[7px] rounded-lg border border-line bg-white px-[10px] py-[9px] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={18} />
              Não peguei
            </button>
          </div>
          <div className="grid gap-[6px]">
            <label htmlFor="note-new" className="text-[0.85rem] font-extrabold">
              {needNote ? "Justificativa (obrigatória para dia atrasado)" : "Observação (opcional)"}
            </label>
            <textarea
              id="note-new"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 500))}
              placeholder={needNote ? "Por que não marcou no dia?" : "Ex: saí mais cedo..."}
              rows={2}
              maxLength={500}
              className="min-h-[56px] resize-y rounded-lg border border-line bg-white p-[10px] focus:border-teal focus:outline-none"
            />
          </div>
          <span className="text-[0.82rem] font-bold text-muted">
            {saving ? "Salvando registro..." : needNote ? "Dia atrasado: escreva a justificativa para liberar os botões." : "Toque para registrar — a gestora confere em tempo real."}
          </span>
        </article>
      );
    }
    if (selectedDate) {
      return (
        <div className="rounded-lg border border-dashed border-line bg-white/70 p-7 text-muted">
          Nenhum almoço lançado para {fullDate(selectedDate)}.
          {" "}Se você trabalhou neste dia, fale com o RH.
        </div>
      );
    }
    return (
      <div className="rounded-lg border border-dashed border-line bg-white/70 p-7 text-muted">
        Toque em um dia marcado com ponto para confirmar.
      </div>
    );
  }

  const isClosed = day.period.status === "CLOSED";
  const isConfirmed = day.confirmationStatus !== "PENDING";
  const isLate = day.date < today && !isConfirmed;
  const isPicked = day.confirmationStatus === "PEGUEI";
  const noteRequired = isLate;
  const canSave = !isClosed && !isConfirmed && (!noteRequired || note.trim().length > 0);

  function submit(status: Exclude<ConfirmationStatus, "PENDING">) {
    if (!canSave) return;
    onCheckin(day!.date, status, note.trim() ? note.trim() : undefined);
  }

  return (
    <article className={cn("grid gap-3 rounded-lg border bg-white p-[14px]", isLate && !isConfirmed ? "border-[#f59e0b]" : "border-teal/25")}>
      <div className="grid gap-[3px]">
        <strong className="text-[1rem]">{fullDate(day.date)}</strong>
        <span className="text-[0.87rem] font-bold text-muted">
          {weekday(day.date)} · {day.quantity} {day.quantity === 1 ? "refeição" : "refeições"}
          {day.date === today ? " · HOJE" : ""}
          {isLate ? " · ATRASADO" : ""}
        </span>
      </div>

      {isConfirmed ? (
        <span className="text-[0.82rem] font-bold text-muted">
          {isPicked ? "Você confirmou que pegou." : "Você confirmou que não pegou."}
          {day.confirmationNote ? ` Observação: ${day.confirmationNote}` : ""}
          {" Para alterar, fale pessoalmente com o RH."}
        </span>
      ) : isClosed ? (
        <span className="text-[0.82rem] font-bold text-muted">Período fechado — somente leitura.</span>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 max-[420px]:grid-cols-1">
            <button
              type="button"
              disabled={!canSave || saving}
              title="Confirmar que peguei"
              aria-label={`Confirmar que peguei almoço em ${fullDate(day.date)}`}
              onClick={() => submit("PEGUEI")}
              className="inline-flex min-h-11 items-center justify-center gap-[7px] rounded-lg border border-line bg-white px-[10px] py-[9px] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check size={18} />
              Peguei
            </button>
            <button
              type="button"
              disabled={!canSave || saving}
              title="Confirmar que não peguei"
              aria-label={`Confirmar que não peguei almoço em ${fullDate(day.date)}`}
              onClick={() => submit("NAO_PEGUEI")}
              className="inline-flex min-h-11 items-center justify-center gap-[7px] rounded-lg border border-line bg-white px-[10px] py-[9px] font-extrabold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              <X size={18} />
              Não peguei
            </button>
          </div>

          <div className="grid gap-[6px]">
            <label htmlFor={`note-${day.id}`} className="text-[0.85rem] font-extrabold">
              {noteRequired ? "Justificativa (obrigatória para dia atrasado)" : "Observação (opcional)"}
            </label>
            <textarea
              id={`note-${day.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 500))}
              placeholder={noteRequired ? "Por que não marcou no dia?" : "Ex: saí mais cedo..."}
              rows={2}
              maxLength={500}
              className="min-h-[56px] resize-y rounded-lg border border-line bg-white p-[10px] focus:border-teal focus:outline-none"
            />
          </div>

          <span className="text-[0.82rem] font-bold text-muted">
            {saving ? "Salvando confirmação..." : noteRequired ? "Dia atrasado: escreva a justificativa para liberar os botões." : "Pendente de confirmação."}
          </span>
        </>
      )}
    </article>
  );
}
