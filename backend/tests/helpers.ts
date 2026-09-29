// Fábricas e limpeza para os testes de API. Cada arquivo usa sufixo próprio
// (emails/nomes únicos) e limpa o que criou — o banco é compartilhado.
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";

// PLAN-013 Task 5: cobertura estrutural do conteúdo do PDF (sem nova dep).
// Extrai texto aproximado do buffer gerado pelo pdfkit com compress:false:
// junta fragmentos hexadecimais `<...>` e literais `(...)` dos content
// streams, decodificando como latin1 (= WinAnsi p/ acentos pt-BR comuns:
// ã/ç/é/í/ó/ú ocupam os mesmos code points).
// LIMITE HONESTO: é verificação estrutural (labels/valores presentes), não
// validação de layout — a conferência visual final é passo humano.
export function pdfTextOf(buffer: Buffer): string {
  const raw = buffer.toString("latin1");
  const streams: string[] = [];
  const streamRe = /stream\r?\n([\s\S]*?)endstream/g;
  let streamMatch: RegExpExecArray | null;
  while ((streamMatch = streamRe.exec(raw)) !== null) streams.push(streamMatch[1]);
  const parts: string[] = [];
  const tokenRe = /<([0-9a-fA-F]+)>|\((?:\\.|[^\\()])*\)/g;
  for (const content of streams) {
    let tokenMatch: RegExpExecArray | null;
    while ((tokenMatch = tokenRe.exec(content)) !== null) {
      if (tokenMatch[1] !== undefined) {
        const hex = tokenMatch[1].length % 2 ? `${tokenMatch[1]}0` : tokenMatch[1];
        parts.push(Buffer.from(hex, "hex").toString("latin1"));
      } else {
        parts.push(
          tokenMatch[0].slice(1, -1)
            .replace(/\\([0-7]{1,3})/g, (_m, oct: string) => String.fromCharCode(parseInt(oct, 8)))
            .replace(/\\([\\()])/g, "$1")
        );
      }
    }
    parts.push("\n");
  }
  return parts.join("");
}


export const d = (value: string) => new Date(`${value}T00:00:00.000Z`);

export async function createUser(suffix: string, role: Role) {
  const passwordHash = await bcrypt.hash("senha-teste", 10);
  return prisma.user.create({
    data: { name: `Teste ${suffix}`, email: `teste-${suffix}@teste.com`, passwordHash, role }
  });
}

export async function createEmployee(suffix: string) {
  return prisma.employee.create({ data: { name: `Func ${suffix}` } });
}

export async function createPeriod(suffix: string, start: string, end: string) {
  return prisma.billingPeriod.create({
    data: { label: `Período ${suffix}`, startDate: d(start), endDate: d(end) }
  });
}

export async function createPrice(value: number, validFrom: string, employeeId?: string) {
  return prisma.mealPrice.create({
    data: { value, validFrom: d(validFrom), employeeId: employeeId ?? null }
  });
}

export async function cleanup(ids: {
  recordIds?: string[];
  priceIds?: string[];
  periodIds?: string[];
  employeeIds?: string[];
  userIds?: string[];
}) {
  // Ordem respeita as FKs.
  if (ids.recordIds?.length) await prisma.mealRecord.deleteMany({ where: { id: { in: ids.recordIds } } });
  if (ids.priceIds?.length) await prisma.mealPrice.deleteMany({ where: { id: { in: ids.priceIds } } });
  if (ids.periodIds?.length) {
    await prisma.mealRecord.deleteMany({ where: { periodId: { in: ids.periodIds } } });
    await prisma.billingPeriod.deleteMany({ where: { id: { in: ids.periodIds } } });
  }
  if (ids.employeeIds?.length) {
    await prisma.mealRecord.deleteMany({ where: { employeeId: { in: ids.employeeIds } } });
    await prisma.mealPrice.deleteMany({ where: { employeeId: { in: ids.employeeIds } } });
    await prisma.employee.deleteMany({ where: { id: { in: ids.employeeIds } } });
  }
  if (ids.userIds?.length) {
    await prisma.auditLog.deleteMany({ where: { actorId: { in: ids.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: ids.userIds } } });
  }
}
