import { Check, X } from "lucide-react";
import styled from "styled-components";
import type { ConfirmationStatus, EmployeePortalDay } from "../../types";
import { fullDate, weekday } from "../../utils/date";

export function DayCheckin({
  day,
  disabled,
  saving,
  onCheckin
}: {
  day: EmployeePortalDay;
  disabled: boolean;
  saving: boolean;
  onCheckin: (date: string, status: Exclude<ConfirmationStatus, "PENDING">) => void;
}) {
  const isPicked = day.confirmationStatus === "PEGUEI";
  const isNotPicked = day.confirmationStatus === "NAO_PEGUEI";

  return (
    <DayCard $disabled={disabled}>
      <DayHeader>
        <strong>{fullDate(day.date)}</strong>
        <span>{weekday(day.date)} · {day.quantity} {day.quantity === 1 ? "refeição" : "refeições"}</span>
      </DayHeader>

      <CheckinActions>
        <CheckinButton
          type="button"
          $active={isPicked}
          $tone="good"
          disabled={disabled || saving}
          title="Confirmar que peguei"
          aria-label={`Confirmar que peguei almoço em ${fullDate(day.date)}`}
          onClick={() => onCheckin(day.date, "PEGUEI")}
        >
          <Check size={18} />
          Peguei
        </CheckinButton>
        <CheckinButton
          type="button"
          $active={isNotPicked}
          $tone="danger"
          disabled={disabled || saving}
          title="Confirmar que não peguei"
          aria-label={`Confirmar que não peguei almoço em ${fullDate(day.date)}`}
          onClick={() => onCheckin(day.date, "NAO_PEGUEI")}
        >
          <X size={18} />
          Não peguei
        </CheckinButton>
      </CheckinActions>

      <StatusText>
        {disabled
          ? "Data futura ou período fechado"
          : saving
            ? "Salvando confirmação..."
            : day.confirmationStatus === "PENDING"
              ? "Pendente de confirmação"
              : `Confirmado pelo ${day.confirmationSource === "WHATSAPP" ? "WhatsApp" : "sistema"}`}
      </StatusText>
    </DayCard>
  );
}

const DayCard = styled.article<{ $disabled: boolean }>`
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid ${({ $disabled }) => ($disabled ? "#e5e7eb" : "rgba(15, 118, 110, 0.22)")};
  border-radius: 8px;
  background: ${({ $disabled }) => ($disabled ? "#f8fafc" : "#fff")};
  opacity: ${({ $disabled }) => ($disabled ? 0.72 : 1)};
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
  }
`;

const StatusText = styled.span`
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 750;
`;
