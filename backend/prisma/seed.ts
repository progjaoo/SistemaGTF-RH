import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role, ScheduleType } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://postgres:mysecretpassword@localhost:5432/sistema_rh?schema=public";

const prisma = new PrismaClient();

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  const passwordHash = await bcrypt.hash("Conquistas@07", 10);

  const rh = await prisma.user.upsert({
    where: { email: "rh@grupogtf.com.br" },
    update: {
      name: "RH Grupo GTF",
      passwordHash,
      role: Role.RH,
      active: true
    },
    create: {
      name: "RH Grupo GTF",
      email: "rh@grupogtf.com.br",
      passwordHash,
      role: Role.RH
    }
  });

  const gestora = await prisma.user.upsert({
    where: { email: "gestora@grupogtf.com.br" },
    update: {
      name: "Gestora Operacional",
      passwordHash,
      role: Role.GESTORA,
      active: true
    },
    create: {
      name: "Gestora Operacional",
      email: "gestora@grupogtf.com.br",
      passwordHash,
      role: Role.GESTORA
    }
  });

  await prisma.user.upsert({
    where: { email: "ti@grupogtf.com.br" },
    update: {
      name: "TI Grupo GTF",
      passwordHash,
      role: Role.RH,
      active: true
    },
    create: {
      name: "TI Grupo GTF",
      email: "ti@grupogtf.com.br",
      passwordHash,
      role: Role.RH
    }
  });

  await prisma.user.upsert({
    where: { email: "admin@grupogtf.com.br" },
    // NUNCA redefine a senha no update: criada uma vez, só o dono troca.
    update: {
      name: "Administrador",
      role: Role.ADMIN,
      active: true
    },
    create: {
      name: "Administrador",
      email: "admin@grupogtf.com.br",
      passwordHash: await bcrypt.hash("Difusora88#@", 10),
      role: Role.ADMIN
    }
  });

  await prisma.mealPrice.upsert({
    where: { id: "77777777-7777-4777-8777-777777777777" },
    update: {},
    create: {
      id: "77777777-7777-4777-8777-777777777777",
      value: 8.5,
      validFrom: date("2026-06-01"),
      createdById: rh.id
    }
  });

  const currentPeriod = await prisma.billingPeriod.upsert({
    where: { id: "99999999-9999-4999-8999-999999999999" },
    update: {},
    create: {
      id: "99999999-9999-4999-8999-999999999999",
      label: "Junho 2026 - 06/06 a 05/07",
      startDate: date("2026-06-06"),
      endDate: date("2026-07-05")
    }
  });

  await prisma.billingPeriod.upsert({
    where: { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" },
    update: {},
    create: {
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      label: "Maio 2026 - 06/05 a 05/06",
      startDate: date("2026-05-06"),
      endDate: date("2026-06-05"),
      status: "CLOSED",
      closedAt: date("2026-06-06"),
      closedById: rh.id,
      totalAmount: 814
    }
  });

  await prisma.auditLog.create({
    data: {
      actorId: rh.id,
      entity: "Seed",
      action: "INITIAL_DATA",
      metadata: {
        users: ["rh@grupogtf.com.br", "gestora@grupogtf.com.br", "ti@grupogtf.com.br", "admin@grupogtf.com.br"],
        password: "Conquistas@07 (admin usa senha própria definida no seed)"
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
