import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import styled from "styled-components";
import { Button, Field, InlineError } from "../../components/ui";
import logoGtf from "../../images/logogtf.png";

export default function LoginPage({ onLogin }: { onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      <LoginShell>
        <LoginIntro>
          <LogoBlock>
            <img src={logoGtf} alt="Grupo GTF" />
          </LogoBlock>
          <IntroCopy>
            <span>GTF - Recursos Humanos</span>
            <strong>Controle de Almoços</strong>
          </IntroCopy>
        </LoginIntro>

        <LoginPanel>
          <FormHeader>
            <h1>Entrar no painel</h1>
          </FormHeader>

          <LoginForm onSubmit={submit}>
            <LoginField>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="rh@grupogtf.com.br"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </LoginField>

            <LoginField>
              <label htmlFor="password">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </LoginField>

            {error && <LoginError>{error}</LoginError>}

            <LoginButton type="submit" disabled={submitting}>
              <ShieldCheck size={18} />
              {submitting ? "Entrando..." : "Entrar"}
            </LoginButton>
          </LoginForm>
        </LoginPanel>
      </LoginShell>
    </LoginLayout>
  );
}

const LoginLayout = styled.main`
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: clamp(18px, 4vw, 52px);
  background:
    radial-gradient(circle at 28% 24%, rgba(47, 135, 122, 0.16), transparent 32%),
    linear-gradient(135deg, #081723 0%, #13283a 55%, #0c1b29 100%);
`;

const LoginShell = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(380px, 0.82fr);
  width: min(1100px, 100%);
  min-height: min(600px, calc(100vh - 72px));
  overflow: hidden;
  border-radius: 28px;
  background: #0b1b29;
  box-shadow: 0 34px 90px rgba(0, 0, 0, 0.32);

  @media (max-width: 920px) {
    grid-template-columns: 1fr;
    min-height: auto;
    border-radius: 22px;
  }
`;

const LoginIntro = styled.aside`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 38px;
  min-width: 0;
  padding: clamp(32px, 4.2vw, 52px);
  background:
    linear-gradient(160deg, rgba(15, 118, 110, 0.22), transparent 48%),
    #071724;
  color: #fff;

  @media (max-width: 920px) {
    gap: 26px;
    padding: 28px;
  }

  @media (max-width: 520px) {
    padding: 22px;
  }
`;

const LogoBlock = styled.div`
  display: inline-flex;
  width: 224px;
  max-width: 48vw;

  img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: contain;
  }
`;

const IntroCopy = styled.div`
  max-width: 470px;

  span {
    display: block;
    color: #2f8f7f;
    font-size: clamp(0.6rem, 1vw, 0.92rem);
    font-weight: 700;
    text-transform: uppercase;
  }

  strong {
    display: block;
    margin-top: 14px;
    color: #fff;
    font-size: clamp(1.00rem, 2.5vw, 4.00rem);
    font-weight: 950;
    line-height: 0.98;
    text-transform: uppercase;
  }

  @media (max-width: 920px) {
    strong {
      margin-top: 10px;
      font-size: clamp(2rem, 9vw, 3.4rem);
    }
  }
`;

const LoginPanel = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: clamp(34px, 4.2vw, 56px);
  border-radius: 0 28px 28px 0;
  background: #fff;

  @media (max-width: 920px) {
    border-radius: 0;
  }

  @media (max-width: 520px) {
    padding: 24px;
  }
`;

const FormHeader = styled.div`
  width: min(390px, 100%);
  margin-bottom: 26px;

  h1 {
    margin: 0;
    color: #101923;
    font-size: clamp(1rem, 2vw, 1.45rem);
    font-weight: 1000;
    line-height: 1;
  }
`;

const LoginForm = styled.form`
  width: min(390px, 100%);
  display: grid;
  gap: 16px;
`;

const LoginField = styled(Field)`
  gap: 9px;

  label {
    color: #8aa0b5;
    font-size: 0.82rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  input {
    min-height: 45px;
    padding: 12px 16px;
    border-color: #dce4ec;
    border-radius: 10px;
    background: #fbfcfd;
    color: #101923;
    font-size: 1.05rem;
    box-shadow: inset 0 0 0 1px rgba(220, 228, 236, 0.35);

    &::placeholder {
      color: #8a929b;
    }
  }
`;

const LoginButton = styled(Button)`
  width: 100%;
  min-height: 52px;
  margin-top: 8px;
  border-radius: 10px;
  font-size: 1rem;
`;

const LoginError = styled(InlineError)`
  padding: 12px 14px;
  border: 1px solid #fecaca;
  border-radius: 10px;
  background: #fff1f2;
  color: #b91c1c;
  font-size: 0.92rem;
`;