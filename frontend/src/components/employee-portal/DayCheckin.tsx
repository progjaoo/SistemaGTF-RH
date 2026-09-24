import { Check, X } from "lucide-react";
import styled from "styled-components";
import { useEffect, useState } from "react";
import type { ConfirmationStatus, EmployeePortalDay } from "../../types";
import { fullDate, weekday } from "../../utils/date";
import { EmptyState } from "../ui";

// Painel de detalhe do dia selecionado no calendário.
// Regras (espelho visual; a API decide): hoje clica direto, passado exige
// justificativa, futuro nunca chega aqui (desabilitado na grade),
// confirmado/fechado são só leitura.
export function DayCheckin({
  day,
  today,
  saving,
  onCheckin
}: {
  day: EmployeePortalDay | undefined;
  today: string;
  saving: boolean;
  onCheckin: (date: string, status: Exclude<ConfirmationStatus, "PENDING">, note?: string) => void;
}) {
  const [note, setNote] = useState("");

  useEffect(() => {
    setNote("");
  }, [day?.id]);

  if (!day) {
    return <EmptyState>Toque em um dia com almoço lançado para confirmar.</EmptyState>;
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
    <DayCard $late={isLate && !isConfirmed}>
      <DayHeader>
        <strong>{fullDate(day.date)}</strong>
        <span>
          {weekday(day.date)} · {day.quantity} {day.quantity === 1 ? "refeição" : "refeições"}
          {day.date === today ? " · HOJE" : ""}
          {isLate ? " · ATRASADO" : ""}
        </span>
      </DayHeader>

      {isConfirmed ? (
        <StatusText>
          {isPicked ? "Você confirmou que pegou." : "Você confirmou que não pegou."}
          {day.confirmationNote ? ` Observação: ${day.confirmationNote}` : ""}
          {" Para alterar, fale pessoalmente com o RH."}
        </StatusText>
      ) : isClosed ? (
        <StatusText>Período fechado — somente leitura.</StatusText>
      ) : (
        <>
          <CheckinActions>
            <CheckinButton
              type="button"
              $active={false}
              $tone="good"
              disabled={!canSave || saving}
              title="Confirmar que peguei"
              aria-label={`Confirmar que peguei almoço em ${fullDate(day.date)}`}
              onClick={() => submit("PEGUEI")}
            >
              <Check size={18} />
              Peguei
            </CheckinButton>
            <CheckinButton
              type="button"
              $active={false}
              $tone="danger"
              disabled={!canSave || saving}
              title="Confirmar que não peguei"
              aria-label={`Confirmar que não peguei almoço em ${fullDate(day.date)}`}
              onClick={() => submit("NAO_PEGUEI")}
            >
              <X size={18} />
              Não peguei
            </CheckinButton>
          </CheckinActions>

          <NoteField>
            <label htmlFor={`note-${day.id}`}>
              {noteRequired ? "Justificativa (obrigatória para dia atrasado)" : "Observação (opcional)"}
            </label>
            <textarea
              id={`note-${day.id}`}
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 500))}
              placeholder={noteRequired ? "Por que não marcou no dia?" : "Ex: saí mais cedo..."}
              rows={2}
              maxLength={500}
            />
          </NoteField>

          <StatusText>
            {saving ? "Salvando confirmação..." : noteRequired ? "Dia atrasado: escreva a justificativa para liberar os botões." : "Pendente de confirmação."}
          </StatusText>
        </>
      )}
    </DayCard>
  );
}

const DayCard = styled.article<{ $late: boolean }>`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${({ $late }) => ($late ? "#f59e0b" : "rgba(15, 118, 110, 0.22)")};
  border-radius: 8px;
  background: #fff;
`;

const DayHeader = styled.div`
  display: grid;
  gap: 3px;

  strong {
    font-size: 1rem;
  }

  span {
    color: var(--muted);
    font-size: 0.87rem;
    font-weight: 700;
  }
`;

const CheckinActions = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;

  @media (max-width: 420px) {
    grid-template-columns: 1fr;
  }
`;

const CheckinButton = styled.button<{ $active: boolean; $tone: "good" | "danger" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-height: 44px;
  padding: 9px 10px;
  border: 1px solid ${({ $active, $tone }) => ($active ? ($tone === "good" ? "var(--teal)" : "var(--wine)") : "var(--line)")};
  border-radius: 8px;
  background: ${({ $active, $tone }) => ($active ? ($tone === "good" ? "var(--teal)" : "var(--wine)") : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : "var(--ink)")};
  font-weight: 850;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
`;

const NoteField = styled.div`
  display: grid;
  gap: 6px;

  label {
    font-size: 0.85rem;
    font-weight: 800;
  }

  textarea {
    min-height: 56px;
    padding: 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    font: inherit;
    resize: vertical;
  }
`;

const StatusText = styled.span`
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 750;
`;
