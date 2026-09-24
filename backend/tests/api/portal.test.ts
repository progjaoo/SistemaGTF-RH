// API: portal do colaborador — check-in com regras de data e período.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createUser, d } from "../helpers.js";

const TAG = "portal";
let rhToken = "";
let portalToken = "";
let employeeId = "";
let openPeriodId = "";
let closedPeriodId = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  ids.employeeIds.push(emp.id);
  // Ativa o acesso ao portal para este funcionário.
  const gen = await request(app).put(`/api/employees/${emp.id}/access-code`)
    .set("Authorization", `Bearer ${rhToken}`).send({});
  portalToken = (await request(app).post("/api/employee-portal/login")
    .send({ employeeId: emp.id, code: gen.body.code })).body.token;
  const open = await createPeriod(`${TAG}-open`, "2020-08-01", "2020-08-31");
  const closed = await createPeriod(`${TAG}-closed`, "2020-07-01", "2020-07-31");
  openPeriodId = open.id;
  closedPeriodId = closed.id;
  ids.periodIds.push(open.id, closed.id);

  // Registros diretos via Prisma (bulk bloquearia futuro/fechado — é o ponto).
  await prisma.mealRecord.create({
    data: { employeeId, periodId: openPeriodId, date: d("2020-08-10"), quantity: 1, registeredById: rh.id }
  });
  for (const day of ["2020-08-12", "2020-08-13", "2020-08-14", "2020-08-15"]) {
    await prisma.mealRecord.create({
      data: { employeeId, periodId: openPeriodId, date: d(day), quantity: 1, registeredById: rh.id }
    });
  }
  await prisma.mealRecord.create({
    data: { employeeId, periodId: openPeriodId, date: d("2099-01-05"), quantity: 1, registeredById: rh.id }
  });
  await prisma.mealRecord.create({
    data: { employeeId, periodId: closedPeriodId, date: d("2020-07-10"), quantity: 1, registeredById: rh.id }
  });
  await prisma.billingPeriod.update({ where: { id: closedPeriodId }, data: { status: "CLOSED" } });
});

afterAll(() => cleanup(ids));

const checkin = (date: string, status = "PEGUEI", note?: string) =>
  request(app).post(`/api/employee-portal/${employeeId}/checkin`)
    .set("Authorization", `Bearer ${portalToken}`)
    .send(note === undefined ? { date, status } : { date, status, note });

describe("employee-portal/checkin", () => {
  it("confirma lançamento passado com justificativa (200)", async () => {
    const res = await checkin("2020-08-10", "PEGUEI", "Confirmação de rotina");
    expect(res.status).toBe(200);
    expect(res.body.record.confirmationStatus).toBe("PEGUEI");
    expect(res.body.record.confirmationSource).toBe("SISTEMA");
  });

  it("data futura dá 422", async () => {
    const res = await checkin("2099-01-05");
    expect(res.status).toBe(422);
  });

  it("período fechado dá 422", async () => {
    const res = await checkin("2020-07-10");
    expect(res.status).toBe(422);
  });

  it("data sem lançamento dá 404", async () => {
    const res = await checkin("2020-08-11");
    expect(res.status).toBe(404);
  });

  it("status inválido dá 422 (Zod)", async () => {
    const res = await checkin("2020-08-10", "TALVEZ");
    expect(res.status).toBe(422);
  });

  it("atrasado sem justificativa dá 422 e nada grava", async () => {
    const res = await checkin("2020-08-12");
    expect(res.status).toBe(422);
    expect(res.body.message).toContain("Justificativa");
    const row = await prisma.mealRecord.findUnique({
      where: { employeeId_date: { employeeId, date: d("2020-08-12") } }
    });
    expect(row?.confirmationStatus).toBe("PENDING");
  });

  it("atrasado com justificativa dá 200 e persiste a nota", async () => {
    const res = await checkin("2020-08-12", "PEGUEI", "Esqueci de marcar ontem");
    expect(res.status).toBe(200);
    expect(res.body.record.confirmationNote).toBe("Esqueci de marcar ontem");
    const row = await prisma.mealRecord.findUnique({
      where: { employeeId_date: { employeeId, date: d("2020-08-12") } }
    });
    expect(row?.confirmationNote).toBe("Esqueci de marcar ontem");
  });

  it("dia já confirmado dá 409 sem alterar", async () => {
    const res = await checkin("2020-08-12", "NAO_PEGUEI", "tentando trocar");
    expect(res.status).toBe(409);
    const row = await prisma.mealRecord.findUnique({
      where: { employeeId_date: { employeeId, date: d("2020-08-12") } }
    });
    expect(row?.confirmationStatus).toBe("PEGUEI");
  });

  it("nota com 501 caracteres dá 422; com 500 passa", async () => {
    const tooLong = await checkin("2020-08-13", "PEGUEI", "x".repeat(501));
    expect(tooLong.status).toBe(422);
    const ok = await checkin("2020-08-13", "PEGUEI", "y".repeat(500));
    expect(ok.status).toBe(200);
  });

  it("observação opcional no dia atual", async () => {
    const todayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(new Date());
    const period = await prisma.billingPeriod.create({
      data: { label: "Período portal-hoje", startDate: d("2020-01-01"), endDate: d("2030-12-31") }
    });
    await prisma.mealRecord.create({
      data: { employeeId, periodId: period.id, date: new Date(`${todayKey}T00:00:00.000Z`), quantity: 1, registeredById: (await prisma.user.findFirst({ where: { email: { startsWith: "teste-portal" } } }))!.id }
    });
    const res = await checkin(todayKey, "PEGUEI", "obs do dia");
    expect(res.status).toBe(200);
    expect(res.body.record.confirmationNote).toBe("obs do dia");
    await prisma.mealRecord.deleteMany({ where: { periodId: period.id } });
    await prisma.billingPeriod.delete({ where: { id: period.id } });
  });

  it("calendar retorna confirmationNote e isLate", async () => {
    const res = await request(app).get(`/api/employee-portal/${employeeId}/calendar?month=2020-08`)
      .set("Authorization", `Bearer ${portalToken}`);
    expect(res.status).toBe(200);
    const day = res.body.days.find((dd) => dd.date === "2020-08-12");
    expect(day.confirmationNote).toBe("Esqueci de marcar ontem");
    expect(day.isLate).toBe(true);
  });
});

describe("employee-portal/search", () => {
  it("exige ao menos 2 caracteres (422)", async () => {
    const res = await request(app).get("/api/employee-portal/search?name=X");
    expect(res.status).toBe(422);
  });

  it("retorna só id, name e hasAccess de ativos", async () => {
    const res = await request(app).get("/api/employee-portal/search?name=Func%20portal");
    expect(res.status).toBe(200);
    expect(res.body.employees.length).toBeGreaterThan(0);
    for (const e of res.body.employees) {
      expect(Object.keys(e).sort()).toEqual(["hasAccess", "id", "name"]);
    }
  });
});
