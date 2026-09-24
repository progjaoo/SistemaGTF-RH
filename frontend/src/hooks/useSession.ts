import { useState } from "react";
import { toast } from "sonner";
import { api } from "../api";
import type { Session } from "../types";

const sessionKey = "sistema-rh-session";

function mapSession() {
  const stored = localStorage.getItem(sessionKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Session;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => mapSession());

  const handleLogin = async (email: string, password: string) => {
    try {
      const nextSession = await api.login(email, password);
      localStorage.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
      toast.success(`Bem-vindo(a), ${nextSession.user.name.split(" ")[0]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(sessionKey);
    setSession(null);
    toast.info("Sessão encerrada. Até logo!");
  };

  return { session, setSession, handleLogin, handleLogout };
}
