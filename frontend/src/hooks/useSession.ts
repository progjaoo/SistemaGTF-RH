import { useState } from "react";
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
    const nextSession = await api.login(email, password);
    localStorage.setItem(sessionKey, JSON.stringify(nextSession));
    setSession(nextSession);
  };

  const handleLogout = () => {
    localStorage.removeItem(sessionKey);
    setSession(null);
  };

  return { session, setSession, handleLogin, handleLogout };
}
