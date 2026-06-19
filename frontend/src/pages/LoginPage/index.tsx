import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import styled from "styled-components";
import { Brand, BrandLogo, BrandText } from "../../components/layout";
import { Button, Field, InlineError } from "../../components/ui";
import logoGtf from "../../images/logogtf.png";

export default function LoginPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("rh@gtf.com.br");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await onLogin(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Não foi possível entrar.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LoginLayout>
      <LoginPanel>
        <LoginBrand>
          <BrandLogo src={logoGtf} alt="Grupo GTF" />
          <BrandText>
            <strong>Sistema RH</strong>
            <span>Controle de almoço</span>
          </BrandText>
        </LoginBrand>
        <LoginTitle>Entrar</LoginTitle>
        <form onSubmit={submit}>
          <Field>
            <label htmlFor="email">E-mail</label>
            <input id="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
          <Field>
            <label htmlFor="password">Senha</label>
            <input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </Field>
          {error && <InlineError>{error}</InlineError>}
          <Button type="submit" disabled={submitting}>
            <ShieldCheck size={17} />
            {submitting ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </LoginPanel>
    </LoginLayout>
  );
}

const LoginLayout = styled.main`
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 20px;
`;

const LoginPanel = styled.section`
  width: min(420px, 100%);
  padding: 26px;
  border: 1px solid var(--line);
  border-top: 6px solid var(--teal);
  border-radius: 8px;
  background: #20262c;
  color: #fff;
  box-shadow: var(--shadow);

  form {
    display: grid;
    gap: 14px;
    margin-top: 20px;
  }

  ${Field} label {
    color: rgba(255, 255, 255, 0.78);
  }
`;

const LoginBrand = styled(Brand)`
  ${BrandLogo} {
    width: 84px;
    height: 64px;
  }
`;

const LoginTitle = styled.h1`
  margin: 28px 0 0;
  font-size: 2.3rem;
  letter-spacing: 0;
`;
