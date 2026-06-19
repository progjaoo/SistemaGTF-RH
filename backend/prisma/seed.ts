import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role, ScheduleType } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://postgres:mysecretpassword@localhost:5432/sistema_rh?schema=public";

const prisma = new PrismaClient();

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

async function main() {
  const passwordHash = await bcrypt.hash("123456", 10);

  const rh = await prisma.user.upsert({
    where: { email: "rh@gtf.com.br" },
    update: {},
    create: {
      name: "RH Grupo GTF",
      email: "rh@gtf.com.br",
      passwordHash,
      role: Role.RH
    }
  });

  const gestora = await prisma.user.upsert({
    where: { email: "gestora@gtf.com.br" },
    update: {},
    create: {
      name: "Gestora Operacional",
      email: "gestora@gtf.com.br",
      passwordHash,
      role: Role.GESTORA
    }
  });

  const employeeSeeds = [
    ["11111111-1111-4111-8111-111111111111", "Maria Eduarda", ScheduleType.MON_FRI],
    ["22222222-2222-4222-8222-222222222222", "Dario Santos", ScheduleType.MON_FRI],
    ["33333333-3333-4333-8333-333333333333", "Geraldo Almeida", ScheduleType.MON_SUN],
    ["44444444-4444-4444-8444-444444444444", "Ana Paula", ScheduleType.MON_FRI],
    ["55555555-5555-4555-8555-555555555555", "Roberto Lima", ScheduleType.MON_SUN],
    ["66666666-6666-4666-8666-666666666666", "Claudia Rocha", ScheduleType.MON_FRI]
  ] as const;

  const employees = await Promise.all(
    employeeSeeds.map(([id, name, scheduleType]) =>
      prisma.employee.upsert({
        where: { id },
        update: {},
        create: {
          id,
          name,
          scheduleType,
          admissionDate: date("2025-01-02")
        }
      })
    )
  );

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

  await prisma.mealPrice.upsert({
    where: { id: "88888888-8888-4888-8888-888888888888" },
    update: {},
    create: {
      id: "88888888-8888-4888-8888-888888888888",
      employeeId: "33333333-3333-4333-8333-333333333333",
      value: 11,
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

  for (const employee of employees) {
    for (const day of ["2026-06-10", "2026-06-11", "2026-06-12", "2026-06-15", "2026-06-16", "2026-06-17"]) {
      const quantity = employee.name === "Geraldo Almeida" && day.endsWith("12") ? 2 : 1;
      await prisma.mealRecord.upsert({
        where: { employeeId_date: { employeeId: employee.id, date: date(day) } },
        update: { quantity },
        create: {
          employeeId: employee.id,
          periodId: currentPeriod.id,
          date: date(day),
          quantity,
          registeredById: gestora.id
        }
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: rh.id,
      entity: "Seed",
      action: "INITIAL_DATA",
      metadata: { users: ["rh@gtf.com.br", "gestora@gtf.com.br"], password: "123456" }
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
