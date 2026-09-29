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

const FINAL_NAMES = [
  "MIQUÉIAS",
  "LETÍCIA",
  "BRUNA",
  "TIAGO",
  "MARCOS",
  "FUMAÇA",
  "AYUME",
  "LUCAS LINO",
  "BETE",
  "JOÃO",
  "CLAITON",
  "PRISCILA",
  "REINALDO",
  "LU DUTRA",
  "LIZANDRA",
  "LU ALVES",
  "VOGEL",
  "PR DÁRIO",
  "LUCAS BATALHA",
  "ISAQUE",
  "Pr. GERALDO",
  "SERGIO",
  "JOSIMAR",
  "ANTONIO",
  "WAGNER",
  "EVANDRO",
  "MANOEL",
  "SEBASTIÃO",
  "CLAUDINEI",
  "RENATINHA"
] as const;

const RENAMES: Record<string, string> = {
  LUCAS: "LUCAS LINO",
  BATALHA: "LUCAS BATALHA",
  GERALDO: "Pr. GERALDO"
};

async function main() {
  const finalNormalized = new Set(FINAL_NAMES.map(normalizeName));

  const renamed: string[] = [];
  const created: string[] = [];
  const deleted: string[] = [];
  const inactivated: string[] = [];

  // 1. Renames primeiro: as origens ("LUCAS", "BATALHA", "GERALDO")
  // normalizadas NÃO estão no conjunto final — se a remoção rodasse antes,
  // elas seriam apagadas/inativadas antes de serem renomeadas.
  for (const [fromNormalized, toName] of Object.entries(RENAMES)) {
    const toNormalized = normalizeName(toName);
    const employees = await prisma.employee.findMany({
      select: { id: true, name: true }
    });
    const from = employees.find((e) => normalizeName(e.name) === fromNormalized);
    if (!from) continue;
    // Já no nome final (p.ex. sync repetido): nada a fazer.
    if (normalizeName(from.name) === toNormalized) continue;
    const targetTaken = employees.some(
      (e) => e.id !== from.id && normalizeName(e.name) === toNormalized
    );
    if (targetTaken) {
      console.log(`Rename pulado (destino ocupado): ${from.name} -> ${toName}`);
      continue;
    }
    const previousName = from.name;
    await prisma.employee.update({
      where: { id: from.id },
      data: { name: toName }
    });
    await prisma.auditLog.create({
      data: {
        entity: "Employee",
        entityId: from.id,
        action: "RENAME_EMPLOYEE_SYNC",
        metadata: { from: previousName, to: toName }
      }
    });
    renamed.push(`${previousName} -> ${toName}`);
  }

  // 2. Remoção/inativação: quem não está na lista final.
  // Apaga SOMENTE sem nenhum MealRecord; com histórico, inativa.
  const current = await prisma.employee.findMany({
    select: { id: true, name: true, status: true }
  });
  for (const employee of current) {
    if (finalNormalized.has(normalizeName(employee.name))) continue;
    const mealCount = await prisma.mealRecord.count({
      where: { employeeId: employee.id }
    });
    if (mealCount === 0) {
      await prisma.employee.delete({ where: { id: employee.id } });
      await prisma.auditLog.create({
        data: {
          entity: "Employee",
          entityId: employee.id,
          action: "DELETE_EMPLOYEE_SYNC",
          metadata: { name: employee.name, mealRecords: 0 }
        }
      });
      deleted.push(employee.name);
    } else if (employee.status === "ACTIVE") {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { status: "INACTIVE" }
      });
      await prisma.auditLog.create({
        data: {
          entity: "Employee",
          entityId: employee.id,
          action: "INACTIVATE_EMPLOYEE_SYNC",
          metadata: { name: employee.name, mealRecords: mealCount }
        }
      });
      inactivated.push(`${employee.name} (${mealCount} registros)`);
    } else {
      console.log(`Já inativo, mantido: ${employee.name} (${mealCount} registros)`);
    }
  }

  // 3. Cria faltantes da lista (mesmo padrão do seed: MON_FRI, 2026-06-01).
  const afterRemoval = await prisma.employee.findMany({
    select: { id: true, name: true }
  });
  const existingByNormalizedName = new Map(
    afterRemoval.map((employee) => [normalizeName(employee.name), employee])
  );
  for (const name of FINAL_NAMES) {
    if (existingByNormalizedName.has(normalizeName(name))) continue;
    const employee = await prisma.employee.create({
      data: {
        name,
        scheduleType: ScheduleType.MON_FRI,
        admissionDate: date("2026-06-01")
      }
    });
    existingByNormalizedName.set(normalizeName(name), employee);
    created.push(name);
  }

  await prisma.auditLog.create({
    data: {
      entity: "Employee",
      action: "SYNC_EMPLOYEES_GTF",
      metadata: { renamed, created, deleted, inactivated }
    }
  });

  console.log(`Renomeados (${renamed.length}): ${renamed.join(", ") || "-"}`);
  console.log(`Criados (${created.length}): ${created.join(", ") || "-"}`);
  console.log(`Apagados (${deleted.length}): ${deleted.join(", ") || "-"}`);
  console.log(`Inativados (${inactivated.length}): ${inactivated.join(", ") || "-"}`);

  const actives = await prisma.employee.findMany({
    where: { status: "ACTIVE" },
    select: { name: true, status: true },
    orderBy: { name: "asc" }
  });
  console.log(`Ativos finais (${actives.length}):`);
  for (const employee of actives) console.log(`  ${employee.status} | ${employee.name}`);
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
