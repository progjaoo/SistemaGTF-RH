// API: lançamentos em massa — atomicidade, unicidade, jornada e período fechado.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createPrice, createUser } from "../helpers.js";

const TAG = "records";
let rhToken = "";
let employeeId = "";
let periodId = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], priceIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  ids.employeeIds.push(emp.id);
  const period = await createPeriod(TAG, "2020-06-01", "2020-06-30");
  periodId = period.id;
  ids.periodIds.push(period.id);
  const price = await createPrice(8.5, "2020-01-01");
  ids.priceIds.push(price.id);
});

afterAll(() => cleanup(ids));

const bulk = (entries: Array<{ employeeId: string; date: string; quantity: number }>, token = rhToken) =>
  request(app).post("/api/meal-records/bulk").set("Authorization", `Bearer ${token}`).send({ periodId, entries });

describe("meal-records/bulk", () => {
  it("salva lote válido (200) com warnings de jornada em array", async () => {
    // 2020-06-10 = quarta (útil), 2020-06-13 = sábado (fora da jornada MON_FRI)
    const res = await bulk([
      { employeeId, date: "2020-06-10", quantity: 1 },
      { employeeId, date: "2020-06-13", quantity: 1 }
    ]);
    expect(res.status).toBe(200);
    expect(res.body.records).toHaveLength(2);
    expect(res.body.warnings).toHaveLength(1);
    expect(res.body.warnings[0].date).toBe("2020-06-13");
  });

  it("rejeita lote inteiro se 1 item for futuro (422 + nada gravado)", async () => {
    const res = await bulk([
      { employeeId, date: "2020-06-15", quantity: 1 },
      { employeeId, date: "2099-01-05", quantity: 1 }
    ]);
    expect(res.status).toBe(422);
    expect(res.body.invalidDates).toContain("2099-01-05");
    const left = await prisma.mealRecord.findMany({ where: { periodId, date: new Date("2020-06-15T00:00:00.000Z") } });
    expect(left).toHaveLength(0);
  });

  it("upsert: mesma data atualiza sem duplicar (@@unique)", async () => {
    await bulk([{ employeeId, date: "2020-06-16", quantity: 1 }]).expect(200);
    await bulk([{ employeeId, date: "2020-06-16", quantity: 2 }]).expect(200);
    const rows = await prisma.mealRecord.findMany({ where: { periodId, date: new Date("2020-06-16T00:00:00.000Z") } });
    expect(rows).toHaveLength(1);
    expect(rows[0].quantity).toBe(2);
  });

  it("quantity 0 apaga o registro", async () => {
    await bulk([{ employeeId, date: "2020-06-17", quantity: 0 }]).expect(200);
    const rows = await prisma.mealRecord.findMany({ where: { periodId, date: new Date("2020-06-17T00:00:00.000Z") } });
    expect(rows).toHaveLength(0);
  });

  it("data fora do período dá 422", async () => {
    const res = await bulk([{ employeeId, date: "2020-07-01", quantity: 1 }]);
    expect(res.status).toBe(422);
  });

  it("período fechado dá 409", async () => {
    await request(app).post(`/api/billing-periods/${periodId}/close`)
      .set("Authorization", `Bearer ${rhToken}`).expect(200);
    const res = await bulk([{ employeeId, date: "2020-06-18", quantity: 1 }]);
    expect(res.status).toBe(409);
  });

  it("CUSTOM com dias seg–sáb: domingo gera warning, segunda não", async () => {
    const period = await createPeriod(`${TAG}-custom`, "2020-07-01", "2020-07-31");
    ids.periodIds.push(period.id);
    const emp = await createEmployee(`${TAG}-custom`);
    ids.employeeIds.push(emp.id);
    await request(app).put(`/api/employees/${emp.id}`).set("Authorization", `Bearer ${rhToken}`)
      .send({ name: emp.name, scheduleType: "CUSTOM", workdays: [1, 2, 3, 4, 5, 6] }).expect(200)
      .expect((res) => {
        if (JSON.stringify(res.body.employee.workdays) !== "[1,2,3,4,5,6]") {
          throw new Error("workdays não persistiu como [1..6]: " + JSON.stringify(res.body.employee.workdays));
        }
      });

    const sunday = await request(app).post("/api/meal-records/bulk")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ periodId: period.id, entries: [{ employeeId: emp.id, date: "2020-07-05", quantity: 1 }] });
    expect(sunday.status).toBe(200);
    expect(sunday.body.warnings).toHaveLength(1);

    const monday = await request(app).post("/api/meal-records/bulk")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ periodId: period.id, entries: [{ employeeId: emp.id, date: "2020-07-06", quantity: 1 }] });
    expect(monday.status).toBe(200);
    expect(monday.body.warnings).toHaveLength(0);
  });
});
