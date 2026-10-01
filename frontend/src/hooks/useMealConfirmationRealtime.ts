import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getSocketConfig } from "../api";
import type { MealConfirmationRealtimePayload } from "../types";

export function useMealConfirmationRealtime({
  token,
  periodId,
  enabled,
  onConfirmation,
  onPoll
}: {
  token: string;
  periodId: string;
  enabled: boolean;
  onConfirmation: (payload: MealConfirmationRealtimePayload) => void;
  onPoll?: () => void;
}) {
  const onConfirmationRef = useRef(onConfirmation);
  const onPollRef = useRef(onPoll);

  useEffect(() => {
    onConfirmationRef.current = onConfirmation;
    onPollRef.current = onPoll;
  }, [onConfirmation, onPoll]);

  useEffect(() => {
    if (!enabled || !token || !periodId) return undefined;

    let pollId: ReturnType<typeof setInterval> | null = null;
    const startPolling = () => {
      if (pollId !== null || !onPollRef.current) return;
      // 8s, só com aba visível: na Vercel não há socket persistente.
      pollId = setInterval(() => {
        if (document.visibilityState === "visible") onPollRef.current?.();
      }, 8000);
    };

    const socketConfig = getSocketConfig();
    const socket = io(socketConfig.url, {
      path: socketConfig.path,
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });

    socket.on("connect", () => {
      socket.emit("period:join", periodId);
      if (pollId !== null) { clearInterval(pollId); pollId = null; }
    });

    // Sem Socket.IO no backend (ex.: serverless na Vercel), a conexão
    // falha de cara — cai para polling em vez de insistir nos retries.
    socket.on("connect_error", () => {
      socket.disconnect();
      startPolling();
    });

    socket.on("meal-confirmation:updated", (payload: MealConfirmationRealtimePayload) => {
      if (payload.periodId === periodId) onConfirmationRef.current(payload);
    });

    return () => {
      if (pollId !== null) clearInterval(pollId);
      socket.emit("period:leave", periodId);
      socket.disconnect();
    };
  }, [enabled, periodId, token]);
}
