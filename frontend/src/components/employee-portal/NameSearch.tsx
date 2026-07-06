import { Search } from "lucide-react";
import styled from "styled-components";
import type { EmployeePortalSearchResult } from "../../types";
import { Button, Field, InlineError } from "../ui";

export function NameSearch({
  query,
  results,
  loading,
  error,
  onQueryChange,
  onSearch,
  onSelect
}: {
  query: string;
  results: EmployeePortalSearchResult[];
  loading: boolean;
  error: string;
  onQueryChange: (value: string) => void;
  onSearch: () => void;
  onSelect: (employee: EmployeePortalSearchResult) => void;
}) {
  return (
    <SearchPanel>
      <div>
        <h1>Portal do Colaborador</h1>
        <p>Digite seu nome para confirmar o almoço lançado para você.</p>
      </div>

      <SearchForm
        onSubmit={(event) => {
          event.preventDefault();
          onSearch();
        }}
      >
        <Field>
          <label htmlFor="employee-name">Nome</label>
          <input
            id="employee-name"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Digite parte do seu nome"
            autoComplete="name"
            required
          />
        </Field>
        <Button type="submit" disabled={loading}>
          <Search size={17} />
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </SearchForm>

      {error && <PortalError>{error}</PortalError>}

      {results.length > 0 && (
        <ResultsList>
          <span>Selecione seu cadastro</span>
          {results.map((employee) => (
            <button key={employee.id} type="button" onClick={() => onSelect(employee)}>
              {employee.name}
            </button>
          ))}
        </ResultsList>
      )}
    </SearchPanel>
  );
}

const SearchPanel = styled.section`
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
    font-size: clamp(1.8rem, 7vw, 2.6rem);
  }

  p {
    margin: 8px 0 0;
    color: var(--muted);
  }
`;

const SearchForm = styled.form`
  display: grid;
  gap: 12px;
`;

const ResultsList = styled.div`
  display: grid;
  gap: 8px;

  span {
    color: var(--muted);
    font-size: 0.86rem;
    font-weight: 800;
  }

  button {
    width: 100%;
    min-height: 46px;
    padding: 10px 12px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: #fff;
    color: var(--ink);
    font-weight: 800;
    text-align: left;
  }

  button:hover {
    border-color: rgba(15, 118, 110, 0.36);
    background: var(--teal-soft);
  }
`;

const PortalError = styled(InlineError)`
  padding: 10px 12px;
  border: 1px solid #fecaca;
  border-radius: 8px;
  background: #fff1f2;
  color: #b91c1c;
`;
