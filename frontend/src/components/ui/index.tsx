import styled from "styled-components";

export const Button = styled.button<{ $variant?: "solid" | "ghost" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 38px;
  padding: 8px 13px;
  border: 1px solid ${({ $variant }) => ($variant === "ghost" ? "var(--line)" : "var(--teal)")};
  border-radius: 8px;
  background: ${({ $variant }) => ($variant === "ghost" ? "var(--surface)" : "var(--teal)")};
  color: ${({ $variant }) => ($variant === "ghost" ? "var(--ink)" : "#fff")};
  font-weight: 750;
  white-space: nowrap;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, color 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    border-color: ${({ $variant }) => ($variant === "ghost" ? "rgba(15, 118, 110, 0.34)" : "#0b625b")};
    background: ${({ $variant }) => ($variant === "ghost" ? "var(--teal-soft)" : "#0b625b")};
    box-shadow: 0 8px 20px rgba(15, 118, 110, 0.14);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  @media (max-width: 420px) {
    white-space: normal;
  }
`;

export const IconButton = styled.button`
  display: inline-grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 8px;
  background: transparent;
  color: inherit;
  transition: background-color 0.2s ease, border-color 0.2s ease, opacity 0.2s ease;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
  }
`;

export const Panel = styled.section`
  min-width: 0;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);

  @media (max-width: 520px) {
    padding: 14px;
  }
`;

export const PanelHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;

  h2 {
    margin: 0;
    font-size: 1.05rem;
  }

  p {
    margin: 4px 0 0;
    color: var(--muted);
    font-size: 0.9rem;
  }

  @media (max-width: 520px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: minmax(280px, 380px) minmax(0, 1fr);
  gap: 18px;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
  }

  @media (max-width: 520px) {
    gap: 12px;
  }
`;

export const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;

  th,
  td {
    padding: 11px 10px;
    border-bottom: 1px solid var(--line);
    text-align: left;
    vertical-align: middle;
  }

  th {
    color: var(--muted);
    font-size: 0.78rem;
    text-transform: uppercase;
  }

  @media (max-width: 720px) {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;

    thead,
    tbody,
    tr {
      width: max-content;
      min-width: 100%;
    }

    th,
    td {
      white-space: nowrap;
    }
  }
`;

export const FormGrid = styled.form`
  display: grid;
  gap: 12px;
`;

export const Field = styled.div`
  display: grid;
  gap: 6px;

  label {
    color: var(--muted);
    font-size: 0.82rem;
    font-weight: 750;
  }

  input,
  select {
    width: 100%;
    min-height: 40px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    color: var(--ink);
  }
`;

export const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-weight: 700;
`;

export const InlineActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  @media (max-width: 520px) {
    align-items: stretch;

    ${Button} {
      flex: 1 1 120px;
    }
  }
`;

export const Badge = styled.span<{ $tone: "good" | "warn" | "muted" }>`
  display: inline-flex;
  padding: 4px 8px;
  border-radius: 999px;
  background: ${({ $tone }) => ($tone === "good" ? "var(--teal-soft)" : $tone === "warn" ? "#fff2d8" : "#edf0f3")};
  color: ${({ $tone }) => ($tone === "good" ? "var(--teal)" : $tone === "warn" ? "var(--amber)" : "var(--muted)")};
  font-size: 0.78rem;
  font-weight: 800;
`;

export const Alert = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 14px;
  padding: 11px 12px;
  border: 1px solid rgba(15, 118, 110, 0.25);
  border-radius: 8px;
  background: var(--teal-soft);
  color: var(--teal);
  font-weight: 750;

  ${IconButton} {
    color: var(--teal);
    border-color: rgba(15, 118, 110, 0.25);
  }

  @media (max-width: 520px) {
    align-items: flex-start;

    span {
      min-width: 0;
      overflow-wrap: anywhere;
    }
  }
`;

export const Loading = styled.div`
  margin-bottom: 14px;
  color: var(--muted);
`;

export const EmptyState = styled.div`
  padding: 28px;
  border: 1px dashed var(--line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  color: var(--muted);
`;

export const InlineError = styled.div`
  color: #ffd1d1;
  font-weight: 750;
`;
