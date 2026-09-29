import { useState } from "react";
import { toast } from "sonner";
import { api } from "../api";
import type { Session } from "../types";

const sessionKey = "sistema-rh-session";

function readStore(key: "localStorage" | "sessionStorage") {
  const store = key === "localStorage" ? localStorage : sessionStorage;
  const stored = store.getItem(sessionKey);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as Session;
  } catch {
    store.removeItem(sessionKey);
    return null;
  }
}

function mapSession() {
  return readStore("localStorage") ?? readStore("sessionStorage");
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(() => mapSession());

  const handleLogin = async (email: string, password: string, remember = false) => {
    try {
      const nextSession = await api.login(email, password, remember);
      const store = remember ? localStorage : sessionStorage;
      store.setItem(sessionKey, JSON.stringify(nextSession));
      setSession(nextSession);
      toast.success(`Bem-vindo(a), ${nextSession.user.name.split(" ")[0]}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível entrar.");
      throw error;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(sessionKey);
    sessionStorage.removeItem(sessionKey);
    setSession(null);
    toast.info("Sessão encerrada. Até logo!");
  };

  return { session, setSession, handleLogin, handleLogout };
}
