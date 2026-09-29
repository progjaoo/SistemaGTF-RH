// API: fechamento do dia (DayClose) — trava a data após conferência completa.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createUser, d } from "../helpers.js";

const TAG = "dayclose";
let rhToken = "";
let rhId = "";
let employeeId = "";
let employeeName = "";
let periodId = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhId = rh.id;
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  employeeName = emp.name;
  ids.employeeIds.push(emp.id);
  const period = await createPeriod(`${TAG}-open`, "2021-07-01", "2021-07-31");
  periodId = period.id;
  ids.periodIds.push(period.id);

  // 2021-07-07 (quarta): PENDING — fecha bloqueado com pending:[nome].
  await prisma.mealRecord.create({
    data: { employeeId, periodId, date: d("2021-07-07"), quantity: 1, registeredById: rh.id }
  });
  // 2021-07-08 (quinta): PEGUEI — fecha ok.
  await prisma.mealRecord.create({
    data: {
      employeeId, periodId, date: d("2021-07-08"), quantity: 1,
      confirmationStatus: "PEGUEI", confirmationSource: "SISTEMA",
      confirmedAt: new Date(), registeredById: rh.id
    }
  });
  // 2021-07-06 (terça): sem record — fecha bloqueado com missing:[nome].
});

afterAll(async () => {
  await prisma.dayClose.deleteMany({ where: { periodId: { in: ids.periodIds } } });
  await cleanup(ids);
});

const close = (date: string) =>
  request(app).post("/api/meal-records/day-close")
    .set("Authorization", `Bearer ${rhToken}`).send({ date });

const reopen = (date: string) =>
  request(app).post("/api/meal-records/day-reopen")
    .set("Authorization", `Bearer ${rhToken}`).send({ date });

describe("day-close", () => {
  it("fecha dia conferido (201)", async () => {
    const res = await close("2021-07-08");
    expect(res.status).toBe(201);
    expect(res.body.dayClose.date).toBe("2021-07-08");
    expect(rhId).toBeTruthy();
  });

  it("repetir fechamento dá 409", async () => {
    const res = await close("2021-07-08");
    expect(res.status).toBe(409);
    expect(res.body.message).toContain("já fechado");
  });

  it("PENDING bloqueia com 409 e lista pending", async () => {
    const res = await close("2021-07-07");
    expect(res.status).toBe(409);
    expect(res.body.pending).toContain(employeeName);
  });

  it("faltante em jornada esperada bloqueia com 409 e lista missing", async () => {
    const res = await close("2021-07-06");
    expect(res.status).toBe(409);
    expect(res.body.missing).toContain(employeeName);
  });

  it("data futura dá 422", async () => {
    const res = await close("2099-01-05");
    expect(res.status).toBe(422);
  });

  it("sem período aberto dá 422", async () => {
    const res = await close("2019-05-05");
    expect(res.status).toBe(422);
  });

  it("reopen de dia fechado dá 200", async () => {
    const res = await reopen("2021-07-08");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("reopen de dia não fechado dá 404", async () => {
    const res = await reopen("2021-07-09");
    expect(res.status).toBe(404);
  });

  it("após reopen, marcação volta a funcionar (200)", async () => {
    const res = await request(app).post("/api/meal-records/confirmations")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ employeeId, date: "2021-07-08", status: "PEGUEI", note: "Remarcado após reabertura" });
    expect(res.status).toBe(200);
    expect(res.body.confirmation.confirmationStatus).toBe("PEGUEI");
  });
});

const LOCKED_MESSAGE = "Dia fechado para lançamentos. Reabra o dia para editar.";

describe("day-close enforcement", () => {
  // Terça/quarta — jornada esperada p/ MON_FRI; datas distintas dos blocos acima.
  const D1 = "2021-07-13";
  const D2 = "2021-07-14";
  let portalToken = "";

  const manual = (date: string) =>
    request(app).post("/api/meal-records/confirmations")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ employeeId, date, status: "PEGUEI", note: "Conferência gestora" });

  const portalCheckin = (date: string) =>
    request(app).post(`/api/employee-portal/${employeeId}/checkin`)
      .set("Authorization", `Bearer ${portalToken}`)
      .send({ date, status: "PEGUEI", note: "Check-in de teste" });

  const bulk = (date: string) =>
    request(app).post("/api/meal-records/bulk")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ periodId, entries: [{ employeeId, date, quantity: 1 }] });

  const importDry = (date: string) =>
    request(app).post("/api/meal-records/import")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ periodId, dryRun: true, rows: [{ employeeId, date, quantity: 1 }] });

  beforeAll(async () => {
    for (const day of [D1, D2]) {
      await prisma.mealRecord.upsert({
        where: { employeeId_date: { employeeId, date: d(day) } },
        update: { quantity: 1, confirmationStatus: "PEGUEI", confirmationSource: "SISTEMA", confirmedAt: new Date() },
        create: {
          employeeId, periodId, date: d(day), quantity: 1,
          confirmationStatus: "PEGUEI", confirmationSource: "SISTEMA",
          confirmedAt: new Date(), registeredById: rhId
        }
      });
    }
    const gen = await request(app).put(`/api/employees/${employeeId}/access-code`)
      .set("Authorization", `Bearer ${rhToken}`).send({});
    portalToken = (await request(app).post("/api/employee-portal/login")
      .send({ employeeId, code: gen.body.code })).body.token;
  });

  it("fecha os dois dias de teste (201)", async () => {
    expect((await close(D1)).status).toBe(201);
    expect((await close(D2)).status).toBe(201);
  });

  it("portal no dia fechado dá 422", async () => {
    const res = await portalCheckin(D1);
    expect(res.status).toBe(422);
    expect(res.body.message).toBe(LOCKED_MESSAGE);
  });

  it("manual no dia fechado dá 422", async () => {
    const res = await manual(D1);
    expect(res.status).toBe(422);
    expect(res.body.message).toBe(LOCKED_MESSAGE);
  });

  it("bulk no dia fechado dá 422 com closedDates", async () => {
    const res = await bulk(D2);
    expect(res.status).toBe(422);
    expect(res.body.message).toBe(LOCKED_MESSAGE);
    expect(res.body.closedDates).toContain(D2);
  });

  it("import no dia fechado falha a linha", async () => {
    const res = await importDry(D2);
    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(false);
    expect(res.body.invalidCount).toBe(1);
    expect(res.body.preview[0].status).toBe("error");
    expect(res.body.preview[0].message).toContain("em dia fechado");
  });

  it("reopen libera as quatro vias (200)", async () => {
    expect((await reopen(D1)).status).toBe(200);
    expect((await reopen(D2)).status).toBe(200);

    const manualRes = await manual(D1);
    expect(manualRes.status).toBe(200);

    const bulkRes = await bulk(D2);
    expect(bulkRes.status).toBe(200);

    const importRes = await request(app).post("/api/meal-records/import")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ periodId, dryRun: false, rows: [{ employeeId, date: D2, quantity: 1 }] });
    expect(importRes.status).toBe(200);

    // Portal: o registro PEGUEI bloqueia re-checkin (409), então remove e
    // recria via self-create para provar que a via voltou a aceitar (200).
    await prisma.mealRecord.delete({ where: { employeeId_date: { employeeId, date: d(D1) } } });
    const portalRes = await portalCheckin(D1);
    expect(portalRes.status).toBe(200);
    expect(portalRes.body.record.confirmationStatus).toBe("PEGUEI");
  });
});

describe("day-status", () => {
  // Quinta — jornada esperada p/ MON_FRI; data distinta dos blocos acima.
  const D = "2021-07-15";

  const status = (date: string) =>
    request(app).get("/api/meal-records/day-status")
      .set("Authorization", `Bearer ${rhToken}`).query({ date });

  it("dia aberto retorna closed:false; após fechar, closed:true", async () => {
    const open = await status(D);
    expect(open.status).toBe(200);
    expect(open.body).toEqual({ date: D, closed: false });

    await prisma.mealRecord.upsert({
      where: { employeeId_date: { employeeId, date: d(D) } },
      update: { quantity: 1, confirmationStatus: "PEGUEI", confirmationSource: "SISTEMA", confirmedAt: new Date() },
      create: {
        employeeId, periodId, date: d(D), quantity: 1,
        confirmationStatus: "PEGUEI", confirmationSource: "SISTEMA",
        confirmedAt: new Date(), registeredById: rhId
      }
    });

    expect((await close(D)).status).toBe(201);

    const closed = await status(D);
    expect(closed.status).toBe(200);
    expect(closed.body).toEqual({ date: D, closed: true });

    expect((await reopen(D)).status).toBe(200);
  });
});
