import { useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { getSocketConfig } from "../api";
import type { MealConfirmationRealtimePayload } from "../types";

export function useMealConfirmationRealtime({
  token,
  periodId,
  enabled,
  onConfirmation
}: {
  token: string;
  periodId: string;
  enabled: boolean;
  onConfirmation: (payload: MealConfirmationRealtimePayload) => void;
}) {
  const onConfirmationRef = useRef(onConfirmation);

  useEffect(() => {
    onConfirmationRef.current = onConfirmation;
  }, [onConfirmation]);

  useEffect(() => {
    if (!enabled || !token || !periodId) return undefined;

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
    });

    // Sem Socket.IO no backend (ex.: serverless na Vercel), a conexão
    // falha de cara — desconecta em vez de insistir nos 5 retries.
    // A tela segue funcional via refetch manual/nas ações.
    socket.on("connect_error", () => {
      socket.disconnect();
    });

    socket.on("meal-confirmation:updated", (payload: MealConfirmationRealtimePayload) => {
      if (payload.periodId === periodId) onConfirmationRef.current(payload);
    });

    return () => {
      socket.emit("period:leave", periodId);
      socket.disconnect();
    };
  }, [enabled, periodId, token]);
}
