// API: importação assistida da planilha — preview, bloqueio integral e commit.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createUser } from "../helpers.js";

const TAG = "import";
let rhToken = "";
let periodId = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const silva = await createEmployee(`${TAG} Silva`);
  const souza = await createEmployee(`${TAG} Souza`);
  ids.employeeIds.push(silva.id, souza.id);
  const period = await createPeriod(TAG, "2020-10-01", "2020-10-31");
  periodId = period.id;
  ids.periodIds.push(period.id);
});

afterAll(() => cleanup(ids));

const importRows = (rows: Array<Record<string, unknown>>, dryRun = false) =>
  request(app).post("/api/meal-records/import").set("Authorization", `Bearer ${rhToken}`)
    .send({ periodId, rows, dryRun });

describe("meal-records/import", () => {
  it("dryRun retorna preview sem gravar", async () => {
    const res = await importRows([
      { name: `Func ${TAG} Silva`, date: "2020-10-05", quantity: 1 },
      { name: "Nome Inexistente Xyz", date: "2020-10-05", quantity: 1 }
    ], true);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.invalidCount).toBe(1);
    expect(res.body.preview[0].status).toBe("ok");
    expect(res.body.preview[1].status).toBe("error");
    const count = await prisma.mealRecord.count({ where: { periodId } });
    expect(count).toBe(0);
  });

  it("nome ambíguo gera erro por linha", async () => {
    const res = await importRows([{ name: `Func ${TAG}`, date: "2020-10-05", quantity: 1 }], true);
    expect(res.body.preview[0].status).toBe("error");
    expect(res.body.preview[0].message).toContain("ambíguo");
  });

  it("commit com linha inválida dá 422 e nada grava", async () => {
    const res = await importRows([
      { name: `Func ${TAG} Silva`, date: "2020-10-06", quantity: 1 },
      { name: `Func ${TAG} Souza`, date: "2099-01-05", quantity: 1 }
    ]);
    expect(res.status).toBe(422);
    const count = await prisma.mealRecord.count({ where: { periodId } });
    expect(count).toBe(0);
  });

  it("commit válido grava e audita IMPORT_PLANILHA", async () => {
    const res = await importRows([
      { name: `Func ${TAG} Silva`, date: "2020-10-07", quantity: 1 },
      { name: `Func ${TAG} Souza`, date: "2020-10-07", quantity: 2 }
    ]);
    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(2);
    const audit = await prisma.auditLog.findFirst({ where: { action: "IMPORT_PLANILHA" } });
    expect(audit).not.toBeNull();
    expect((audit!.metadata as { periodId: string }).periodId).toBe(periodId);
  });

  it("período fechado dá 409", async () => {
    await request(app).post(`/api/billing-periods/${periodId}/close`)
      .set("Authorization", `Bearer ${rhToken}`).expect(200);
    const res = await importRows([{ name: `Func ${TAG} Silva`, date: "2020-10-08", quantity: 1 }]);
    expect(res.status).toBe(409);
  });
});
