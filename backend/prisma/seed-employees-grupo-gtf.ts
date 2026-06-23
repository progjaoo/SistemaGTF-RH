import "dotenv/config";
import { PrismaClient, ScheduleType } from "@prisma/client";

process.env.DATABASE_URL ??= "postgresql://postgres:mysecretpassword@localhost:5432/sistema_rh?schema=public";

const prisma = new PrismaClient();

const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const employeeNames = [
  "MIQUÉIAS",
  "LETÍCIA",
  "BRUNA",
  "TIAGO",
  "MARCOS",
  "FUMAÇA",
  "AYUME",
  "LUCAS",
  "BETE",
  "CLAITON",
  "PRISCILA",
  "REINALDO",
  "LU DUTRA",
  "LIZANDRA",
  "LU ALVES",
  "VOGEL",
  "PR DÁRIO",
  "BATALHA",
  "ISAQUE",
  "GERALDO",
  "SERGIO",
  "JOSIMAR",
  "ANTONIO",
  "WAGNER",
  "EVANDRO",
  "MANOEL",
  "SEBASTIÃO",
  "CLAUDINEI"
] as const;

async function main() {
  const existingEmployees = await prisma.employee.findMany({
    select: {
      id: true,
      name: true
    }
  });

  const existingByNormalizedName = new Map(
    existingEmployees.map((employee) => [normalizeName(employee.name), employee])
  );

  const created: string[] = [];
  const skipped: string[] = [];

  for (const name of employeeNames) {
    const normalizedName = normalizeName(name);
    const existing = existingByNormalizedName.get(normalizedName);

    if (existing) {
      skipped.push(name);
      continue;
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        scheduleType: ScheduleType.MON_FRI,
        admissionDate: date("2026-06-01")
      }
    });

    existingByNormalizedName.set(normalizedName, employee);
    created.push(name);
  }

  await prisma.auditLog.create({
    data: {
      entity: "Employee",
      action: "BULK_SEED_GRUPO_GTF",
      metadata: {
        created,
        skipped,
        ignored: ["JOÃO MARCOS"]
      }
    }
  });

  console.log(`Funcionários criados: ${created.length}`);
  if (created.length) console.log(created.join(", "));
  console.log(`Funcionários já existentes/ignorados por nome: ${skipped.length}`);
  if (skipped.length) console.log(skipped.join(", "));
  console.log("Funcionário ignorado conforme solicitado: JOÃO MARCOS");
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
