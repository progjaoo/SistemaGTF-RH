import { FormEvent, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <main className="grid min-h-[100dvh] place-items-center bg-[radial-gradient(circle_at_28%_24%,rgb(60_196_189/0.25),transparent_32%),linear-gradient(135deg,#1E8C86_0%,#145e59_55%,#0c3a37_100%)] px-[clamp(18px,4vw,52px)]">
      <section className="grid w-[min(1100px,100%)] overflow-hidden rounded-[28px] bg-[#0e2f2c] shadow-2xl min-h-[min(600px,calc(100dvh-72px))] md:grid-cols-[1.08fr_0.82fr] max-md:min-h-0 max-md:rounded-[22px] max-md:grid-cols-1">
        <aside className="flex min-w-0 flex-col justify-between gap-[38px] bg-[linear-gradient(160deg,rgb(43_168_162/0.25),transparent_48%),#0a2422] p-[clamp(32px,4.2vw,52px)] text-white max-md:gap-[26px] max-md:p-7 max-sm:p-[22px]">
          <div className="inline-flex w-56 max-w-[48vw]">
            <img src={logoGtf} alt="Grupo GTF" className="block h-auto w-full object-contain" />
          </div>
          <div className="max-w-[470px]">
            <span className="block text-[clamp(0.6rem,1vw,0.92rem)] font-bold uppercase text-teal-hover">GTF - Recursos Humanos</span>
            <strong className="mt-[14px] block text-[clamp(1rem,2.5vw,4rem)] font-black uppercase leading-[0.98] text-white max-md:mt-[10px] max-md:text-[clamp(2rem,9vw,3.4rem)]">Controle de Almoços</strong>
          </div>
        </aside>

        <section className="flex min-w-0 flex-col items-center justify-center rounded-r-[28px] bg-surface p-[clamp(34px,4.2vw,56px)] max-md:rounded-none max-sm:p-6">
          <div className="mb-[26px] w-[min(390px,100%)]">
            <h1 className="m-0 text-[clamp(1rem,2vw,1.45rem)] font-black leading-none text-ink">Entrar no painel</h1>
          </div>

          <form onSubmit={submit} className="grid w-[min(390px,100%)] gap-4">
            <div className="grid gap-[9px]">
              <label htmlFor="email" className="text-[0.82rem] font-semibold uppercase text-[#8aa0b5]">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="rh@grupogtf.com.br"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="min-h-[45px] rounded-[10px] border border-[#dce4ec] bg-cream px-4 py-3 text-[1.05rem] text-ink shadow-[inset_0_0_0_1px_rgb(220_228_236/0.35)] placeholder:text-[#8a929b] focus:border-teal focus:outline-none"
              />
            </div>

            <div className="grid gap-[9px]">
              <label htmlFor="password" className="text-[0.82rem] font-semibold uppercase text-[#8aa0b5]">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="min-h-[45px] rounded-[10px] border border-[#dce4ec] bg-cream px-4 py-3 text-[1.05rem] text-ink shadow-[inset_0_0_0_1px_rgb(220_228_236/0.35)] placeholder:text-[#8a929b] focus:border-teal focus:outline-none"
              />
            </div>

            {error && <div role="alert" className="rounded-[10px] border border-danger/30 bg-danger/5 px-[14px] py-3 text-[0.92rem] font-bold text-danger">{error}</div>}

            <Button type="submit" variant="primary" size="lg" disabled={submitting} className="mt-2 w-full text-base">
              <ShieldCheck size={18} />
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </section>
      </section>
    </main>
  );
}
