// API: DELETE de períodos com travas (plan-015 Task 1).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createUser, d } from "../helpers.js";

const TAG = "periodsdel";
let rhToken = "";
let gestToken = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], employeeIds: [] as string[], recordIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  const gest = await createUser(`${TAG}-gest`, "GESTORA");
  ids.userIds.push(rh.id, gest.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  gestToken = (await request(app).post("/api/auth/login").send({ email: gest.email, password: "senha-teste" })).body.token;
});

afterAll(() => cleanup(ids));

describe("DELETE /billing-periods/:id", () => {
  it("deleta período OPEN vazio (200 + some do GET)", async () => {
    const period = await createPeriod(`${TAG}-empty`, "2031-01-01", "2031-01-31");
    const res = await request(app).delete(`/api/billing-periods/${period.id}`).set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(await prisma.billingPeriod.findUnique({ where: { id: period.id } })).toBeNull();
  });

  it("período CLOSED → 409 e preservado", async () => {
    const period = await createPeriod(`${TAG}-closed`, "2031-02-01", "2031-02-28");
    ids.periodIds.push(period.id);
    await request(app).post(`/api/billing-periods/${period.id}/close`).set("Authorization", `Bearer ${rhToken}`).expect(200);

    const res = await request(app).delete(`/api/billing-periods/${period.id}`).set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(409);
    expect(await prisma.billingPeriod.findUnique({ where: { id: period.id } })).not.toBeNull();
  });

  it("período OPEN com lançamento → 409 e preservado", async () => {
    const period = await createPeriod(`${TAG}-withrec`, "2031-03-01", "2031-03-31");
    ids.periodIds.push(period.id);
    const emp = await createEmployee(`${TAG}-emp`);
    ids.employeeIds.push(emp.id);
    const record = await prisma.mealRecord.create({
      data: { employeeId: emp.id, periodId: period.id, date: d("2031-03-10"), quantity: 1 }
    });
    ids.recordIds.push(record.id);

    const res = await request(app).delete(`/api/billing-periods/${period.id}`).set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(409);
    expect(await prisma.billingPeriod.findUnique({ where: { id: period.id } })).not.toBeNull();
  });

  it("inexistente → 404; sem token → 401; gestora → 403", async () => {
    const fakeId = "00000000-0000-0000-0000-000000000000";
    await request(app).delete(`/api/billing-periods/${fakeId}`).set("Authorization", `Bearer ${rhToken}`).expect(404);
    const period = await createPeriod(`${TAG}-rbac`, "2031-04-01", "2031-04-30");
    ids.periodIds.push(period.id);
    await request(app).delete(`/api/billing-periods/${period.id}`).expect(401);
    await request(app).delete(`/api/billing-periods/${period.id}`).set("Authorization", `Bearer ${gestToken}`).expect(403);
  });
});
