import type { Server as HttpServer } from "node:http";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";

type SocketUser = {
  id: string;
  role: string;
};

export type MealConfirmationPayload = {
  periodId: string;
  confirmation: {
    employeeId: string;
    employeeName: string;
    date: string;
    quantity: number;
    confirmationStatus: "PENDING" | "PEGUEI" | "NAO_PEGUEI";
    confirmationSource: "SISTEMA" | "WHATSAPP" | null;
    confirmationNote: string | null;
    confirmedAt: string | null;
  };
};

type SocketLike = {
  handshake: { auth: { token?: unknown } };
  data: Record<string, unknown>;
  join(room: string): void;
  leave(room: string): void;
  on(event: "period:join" | "period:leave", listener: (periodId: unknown) => void): void;
};

type RealtimeServer = {
  use(listener: (socket: SocketLike, next: (error?: Error) => void) => void | Promise<void>): void;
  on(event: "connection", listener: (socket: SocketLike) => void): void;
  to(room: string): { emit(event: "meal-confirmation:updated", payload: MealConfirmationPayload): void };
};

type RealtimeServerConstructor = new (httpServer: HttpServer, options: Record<string, unknown>) => RealtimeServer;

let realtimeServer: RealtimeServer | null = null;

const periodRoom = (periodId: string) => `period:${periodId}`;

async function loadSocketServer(): Promise<RealtimeServerConstructor> {
  const socketIoModule = await (new Function("return import('socket.io')")() as Promise<{ Server: RealtimeServerConstructor }>);
  return socketIoModule.Server;
}

export async function initRealtime(httpServer: HttpServer) {
  const Server = await loadSocketServer();
  const io = new Server(httpServer, {
    path: "/api/socket.io",
    transports: ["websocket"],
    cors: {
      origin: config.corsOrigin,
      credentials: true
    },
    serveClient: false
  });

  io.use(async (socket, next) => {
    const token = typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : "";
    if (!token) return next(new Error("Sessão não autenticada."));

    try {
      const payload = jwt.verify(token, config.jwtSecret) as { sub: string; role?: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, active: true }
      });

      if (!user?.active) return next(new Error("Usuário inativo ou inexistente."));

      socket.data.user = {
        id: user.id,
        role: user.role
      } satisfies SocketUser;

      return next();
    } catch {
      return next(new Error("Token inválido ou expirado."));
    }
  });

  io.on("connection", (socket) => {
    socket.on("period:join", (periodId: unknown) => {
      if (typeof periodId !== "string" || periodId.length < 8) return;
      socket.join(periodRoom(periodId));
    });

    socket.on("period:leave", (periodId: unknown) => {
      if (typeof periodId !== "string" || periodId.length < 8) return;
      socket.leave(periodRoom(periodId));
    });
  });

  realtimeServer = io;
  return io;
}

export function emitMealConfirmationUpdated(payload: MealConfirmationPayload) {
  realtimeServer?.to(periodRoom(payload.periodId)).emit("meal-confirmation:updated", payload);
}
