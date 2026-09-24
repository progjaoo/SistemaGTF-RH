import { KeyRound } from "lucide-react";
import styled from "styled-components";
import { useState } from "react";
import type { EmployeePortalSearchResult } from "../../types";
import { Button, Field, InlineError } from "../ui";

export function AccessCodeStep({
  employee,
  loading,
  error,
  onSubmit,
  onBack
}: {
  employee: EmployeePortalSearchResult;
  loading: boolean;
  error: string;
  onSubmit: (code: string) => void;
  onBack: () => void;
}) {
  const [code, setCode] = useState("");

  return (
    <CodePanel>
      <div>
        <h1>Olá, {employee.name}</h1>
        <p>Digite seu código de acesso de 6 dígitos (entregue pelo RH).</p>
      </div>

      <CodeForm
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(code);
        }}
      >
        <Field>
          <label htmlFor="access-code">Código de acesso</label>
          <CodeInput
            id="access-code"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="••••••"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            minLength={6}
            maxLength={6}
          />
        </Field>
        <Button type="submit" disabled={loading || code.length !== 6}>
          <KeyRound size={17} />
          {loading ? "Verificando..." : "Entrar"}
        </Button>
        <GhostButton type="button" onClick={onBack}>
          Trocar nome
        </GhostButton>
      </CodeForm>

      {error && <PortalError>{error}</PortalError>}
    </CodePanel>
  );
}

const CodePanel = styled.section`
  display: grid;
  gap: 18px;
  width: min(520px, 100%);
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  box-shadow: var(--shadow);

  h1 {
    margin: 0;
    font-size: clamp(1.5rem, 6vw, 2.1rem);
  }

  p {
    margin: 8px 0 0;
    color: var(--muted);
  }
`;

const CodeForm = styled.form`
  display: grid;
  gap: 12px;
`;

const CodeInput = styled.input`
  font-size: 1.6rem !important;
  letter-spacing: 0.5em;
  text-align: center;
`;

const GhostButton = styled.button`
  min-height: 44px;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: #fff;
  color: var(--teal);
  font-weight: 850;
`;

const PortalError = styled(InlineError)`
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #b91c1c;
`;
