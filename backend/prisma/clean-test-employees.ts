import "dotenv/config";
import { PrismaClient } from "@prisma/client";

process.env.DATABASE_URL ??=
  "postgresql://postgres:postgres@localhost:5433/sistema_rh_test?schema=public";

const prisma = new PrismaClient();

const normalizeName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

const TEST_NAMES = [
  "Ana Paula",
  "Claudia Rocha",
  "Colab Dia Vivo",
  "Colab Dia Vivo2",
  "Colab Regra Nova",
  "Colab Selfcheck Vivo",
  "Dario Santos",
  "Funcionario Teste Docker",
  "Geraldo Almeida",
  "Maria Eduarda",
  "Roberto Lima"
] as const;

async function main() {
  const testNormalized = new Set(TEST_NAMES.map(normalizeName));

  const deleted: string[] = [];
  const inactivated: string[] = [];
  const alreadyInactive: string[] = [];

  const employees = await prisma.employee.findMany({
    select: { id: true, name: true, status: true }
  });

  for (const employee of employees) {
    if (!testNormalized.has(normalizeName(employee.name))) continue;
    const mealCount = await prisma.mealRecord.count({
      where: { employeeId: employee.id }
    });
    if (mealCount === 0) {
      await prisma.employee.delete({ where: { id: employee.id } });
      await prisma.auditLog.create({
        data: {
          entity: "Employee",
          entityId: employee.id,
          action: "CLEANUP_EMPLOYEE_DELETE",
          metadata: { name: employee.name, mealRecords: 0 }
        }
      });
      deleted.push(employee.name);
      console.log(`Deletado (sem historico): ${employee.name}`);
    } else if (employee.status === "ACTIVE") {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { status: "INACTIVE" }
      });
      await prisma.auditLog.create({
        data: {
          entity: "Employee",
          entityId: employee.id,
          action: "CLEANUP_EMPLOYEE_INACTIVATE",
          metadata: { name: employee.name, mealRecords: mealCount }
        }
      });
      inactivated.push(`${employee.name} (${mealCount} registros)`);
      console.log(`Inativado (com historico): ${employee.name} (${mealCount} registros)`);
    } else {
      alreadyInactive.push(`${employee.name} (${mealCount} registros)`);
      console.log(`Ja inativo, mantido: ${employee.name} (${mealCount} registros)`);
    }
  }

  await prisma.auditLog.create({
    data: {
      entity: "Employee",
      action: "SYNC_CLEANUP_TEST_EMPLOYEES",
      metadata: { deleted, inactivated, alreadyInactive }
    }
  });

  console.log(`Apagados (${deleted.length}): ${deleted.join(", ") || "-"}`);
  console.log(`Inativados (${inactivated.length}): ${inactivated.join(", ") || "-"}`);
  console.log(`Ja inativos (${alreadyInactive.length}): ${alreadyInactive.join(", ") || "-"}`);

  const remaining = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { name: true }
  });
  const leftovers = remaining.filter((e) => testNormalized.has(normalizeName(e.name)));
  console.log(`Ativos restantes da lista de teste (${leftovers.length}): ${leftovers.map((e) => e.name).join(", ") || "-"}`);
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
