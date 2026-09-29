import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { api } from "../../api";
import { pushSupported, subscribeForLunchReminders, unsubscribeFromLunchReminders } from "../../utils/push";

export function PushReminderToggle({ employeeId, portalToken }: { employeeId: string; portalToken: string }) {
  const [state, setState] = useState<"unsupported" | "off" | "on" | "blocked" | "busy">("off");

  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!pushSupported()) { if (!ignore) setState("unsupported"); return; }
      if (Notification.permission === "denied") { if (!ignore) setState("blocked"); return; }
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (!ignore) setState(existing ? "on" : "off");
    })();
    return () => { ignore = true; };
  }, []);

  async function enable() {
    setState("busy");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState(permission === "denied" ? "blocked" : "off"); return; }
      const { publicKey } = await api.pushVapidKey(portalToken, employeeId);
      const json = await subscribeForLunchReminders(publicKey);
      await api.pushSubscribe(portalToken, employeeId, json);
      setState("on");
    } catch { setState("off"); }
  }

  async function disable() {
    setState("busy");
    try {
      const endpoint = await unsubscribeFromLunchReminders();
      if (endpoint) await api.pushUnsubscribe(portalToken, employeeId, endpoint).catch(() => {});
      setState("off");
    } catch { setState("on"); }
  }

  if (state === "unsupported") return null;
  if (state === "blocked") {
    return <p className="text-[0.82rem] font-bold text-muted">Lembretes bloqueados no navegador — libere nas configurações do site para receber o aviso das 14:30.</p>;
  }
  return (
    <button type="button" onClick={() => void (state === "on" ? disable() : enable())} disabled={state === "busy"}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm font-bold text-teal-deep disabled:opacity-60">
      {state === "on" ? <><BellOff size={16} /> Desativar lembrete 14:30</> : <><Bell size={16} /> {state === "busy" ? "Ativando..." : "Ativar lembrete 14:30"}</>}
    </button>
  );
}