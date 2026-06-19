import styled from "styled-components";
import { Button } from "../ui";

export const RecordsLayout = styled.section`
  display: grid;
  gap: 18px;
`;

export const RecordsHero = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 4px;

  @media (max-width: 720px) {
    align-items: stretch;
    flex-direction: column;
    gap: 12px;
  }
`;

export const RecordsTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;

  h2 {
    margin: 0;
    font-size: clamp(1.45rem, 2.2vw, 2.25rem);
    letter-spacing: 0;
  }

  p {
    margin: 3px 0 0;
    color: var(--muted);
  }

  @media (max-width: 520px) {
    align-items: flex-start;
    gap: 10px;

    h2 {
      font-size: 1.35rem;
      line-height: 1.12;
    }
  }
`;

export const RecordsMark = styled.div`
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 8px;
  background: var(--teal);
  color: #fff;
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.22);

  @media (max-width: 520px) {
    width: 46px;
    height: 46px;
  }
`;

export const SaveButton = styled(Button)`
  min-height: 54px;
  padding: 12px 20px;
  box-shadow: 0 14px 28px rgba(15, 118, 110, 0.24);

  @media (max-width: 720px) {
    width: 100%;
  }
`;

export const DailyControls = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 470px) minmax(260px, 1fr) minmax(140px, 180px);
  gap: 12px;

  @media (max-width: 1050px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 10px;
  }
`;

export const DateCard = styled.div`
  display: grid;
  grid-template-columns: 52px 1fr 52px;
  align-items: center;
  min-height: 76px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);

  @media (max-width: 520px) {
    grid-template-columns: 44px minmax(0, 1fr) 44px;
    min-height: 66px;
  }
`;

export const DateNavButton = styled.button`
  display: grid;
  height: 100%;
  min-height: 74px;
  place-items: center;
  border: 0;
  background: transparent;
  color: var(--steel);

  &:disabled {
    opacity: 0.32;
    cursor: not-allowed;
  }

  @media (max-width: 520px) {
    min-height: 64px;
  }
`;

export const DateSummary = styled.div`
  display: grid;
  justify-items: center;
  gap: 3px;
  padding: 11px 6px;
  text-align: center;

  strong {
    font-size: 1.05rem;
  }

  span {
    color: var(--muted);
    font-size: 0.88rem;
    text-transform: capitalize;
  }

  @media (max-width: 520px) {
    strong {
      font-size: 0.95rem;
    }

    span {
      font-size: 0.8rem;
    }
  }
`;

export const InfoCard = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 76px;
  padding: 14px 16px;
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 8px;
  background: var(--teal-soft);
  color: var(--teal);
  font-weight: 750;

  @media (max-width: 520px) {
    align-items: flex-start;
    min-height: 0;
    padding: 12px;
    font-size: 0.88rem;
  }
`;

export const DailyTotalCard = styled.div`
  display: grid;
  align-content: center;
  justify-items: center;
  min-height: 76px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);

  span {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 750;
  }

  strong {
    font-size: 1.8rem;
    line-height: 1;
  }

  @media (max-width: 520px) {
    min-height: 66px;
  }
`;

export const RecordsTools = styled.div`
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.74);
  box-shadow: var(--shadow);

  @media (max-width: 820px) {
    align-items: stretch;
    flex-direction: column;
  }

  @media (max-width: 520px) {
    padding: 12px;
  }
`;

export const SearchField = styled.div`
  display: grid;
  gap: 7px;
  width: min(420px, 100%);

  label {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 750;
  }
`;

export const SearchInputWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--muted);

  input {
    width: 100%;
    min-width: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--ink);
  }

  &:focus-within {
    border-color: rgba(15, 118, 110, 0.55);
    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.12);
  }
`;

export const BulkActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  max-width: 620px;

  @media (max-width: 820px) {
    justify-content: stretch;
    max-width: none;

    ${Button} {
      flex: 1 1 210px;
    }
  }

  @media (max-width: 520px) {
    ${Button} {
      flex: 1 1 100%;
      width: 100%;
    }
  }
`;

export const SortHint = styled.span`
  flex: 1 1 100%;
  color: var(--muted);
  font-size: 0.82rem;
  font-weight: 750;
  text-align: right;

  @media (max-width: 820px) {
    text-align: left;
  }
`;

export const EmployeeCards = styled.div`
  display: grid;
  gap: 10px;
`;

export const EmployeeMealCard = styled.article<{ $warn: boolean }>`
  display: grid;
  grid-template-columns: minmax(240px, 1.4fr) minmax(250px, 360px) 38px;
  align-items: center;
  gap: 16px;
  min-height: 92px;
  padding: 14px 16px;
  border: 1px solid ${({ $warn }) => ($warn ? "rgba(217, 119, 6, 0.38)" : "var(--line)")};
  border-left: 5px solid ${({ $warn }) => ($warn ? "var(--amber)" : "var(--teal)")};
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);

  @media (max-width: 840px) {
    grid-template-columns: 1fr auto;
    align-items: start;
  }

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
    gap: 12px;
    min-height: 0;
    padding: 12px;
  }
`;

export const EmployeeIdentity = styled.div`
  display: flex;
  align-items: center;
  gap: 13px;
  min-width: 0;

  strong {
    display: block;
    overflow-wrap: anywhere;
    font-size: 1.04rem;
  }

  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 5px;
    color: var(--muted);
    font-size: 0.9rem;
  }

  @media (max-width: 520px) {
    align-items: flex-start;

    span {
      flex-wrap: wrap;
    }
  }
`;

export const EmployeeInitials = styled.div`
  display: grid;
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  place-items: center;
  border: 1px solid rgba(15, 118, 110, 0.18);
  border-radius: 8px;
  background: linear-gradient(180deg, var(--teal-soft), #fff);
  color: var(--teal);
  font-weight: 900;

  @media (max-width: 520px) {
    width: 44px;
    height: 44px;
  }
`;

export const QuantityControl = styled.div`
  display: grid;
  grid-template-columns: 58px minmax(110px, 1fr) 58px;
  align-items: stretch;
  justify-self: stretch;
  min-height: 58px;
  border: 1px solid var(--line);
  border-radius: 8px;
  overflow: hidden;
  background: #fff;

  @media (max-width: 620px) {
    width: 100%;
    grid-template-columns: 52px minmax(92px, 1fr) 52px;
  }
`;

export const QuantityButton = styled.button`
  display: grid;
  place-items: center;
  border: 0;
  background: var(--teal-soft);
  color: var(--teal);

  &:hover:not(:disabled) {
    background: rgba(15, 118, 110, 0.18);
  }

  &:disabled {
    color: var(--muted);
    background: #f3f5f7;
    cursor: not-allowed;
  }
`;

export const QuantityValue = styled.div`
  display: grid;
  place-items: center;
  padding: 7px 10px;

  strong {
    font-size: 1.35rem;
    line-height: 1;
  }

  span {
    margin-top: 3px;
    color: var(--muted);
    font-size: 0.78rem;
    font-weight: 750;
  }
`;

export const RowWarning = styled.div`
  display: grid;
  justify-self: end;
  width: 36px;
  height: 36px;
  place-items: center;
  color: var(--amber);

  @media (max-width: 840px) {
    grid-column: 2;
    grid-row: 1;
  }

  @media (max-width: 620px) {
    justify-self: start;
    grid-column: auto;
    grid-row: auto;
  }
`;

export const SaveStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid rgba(15, 118, 110, 0.2);
  border-radius: 8px;
  background: var(--teal-soft);
  color: var(--teal);
  font-weight: 750;

  @media (max-width: 520px) {
    align-items: flex-start;
    padding: 12px;
    font-size: 0.9rem;
  }
`;
