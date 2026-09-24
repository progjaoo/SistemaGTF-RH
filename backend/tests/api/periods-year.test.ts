// API: gerador ano → 12 mensais (bulk-year).
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createUser } from "../helpers.js";

const TAG = "bulkyear";
let rhToken = "";
let gestToken = "";
const createdIds: string[] = [];
const ids = { userIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  const gest = await createUser(`${TAG}-gest`, "GESTORA");
  ids.userIds.push(rh.id, gest.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  gestToken = (await request(app).post("/api/auth/login").send({ email: gest.email, password: "senha-teste" })).body.token;
});

afterAll(async () => {
  if (createdIds.length > 0) {
    await prisma.mealRecord.deleteMany({ where: { periodId: { in: createdIds } } });
    await prisma.billingPeriod.deleteMany({ where: { id: { in: createdIds } } });
  }
  await cleanup(ids);
});

const gen = (body: Record<string, unknown>, token = rhToken) =>
  request(app).post("/api/billing-periods/bulk-year").set("Authorization", `Bearer ${token}`).send(body);

describe("billing-periods/bulk-year", () => {
  it("gestora não gera (403)", async () => {
    await gen({ year: 2030, cutDay: 6 }, gestToken).expect(403);
  });

  it("cutDay fora de 1–28 dá 422", async () => {
    await gen({ year: 2030, cutDay: 31 }).expect(422);
    await gen({ year: 2030, cutDay: 0 }).expect(422);
  });

  it("gera 12 mensais de 2030 com corte 06 e virada de ano", async () => {
    const res = await gen({ year: 2030, cutDay: 6 });
    expect(res.status).toBe(201);
    expect(res.body.periods).toHaveLength(12);
    createdIds.push(...res.body.periods.map((p) => p.id));
    expect(res.body.periods[0].label).toBe("Janeiro 2030 - 06/01 a 05/02");
    expect(res.body.periods[0].startDate).toBe("2030-01-06");
    expect(res.body.periods[11].label).toBe("Dezembro 2030 - 06/12 a 05/01");
    expect(res.body.periods[11].startDate).toBe("2030-12-06");
    expect(res.body.periods[11].endDate).toBe("2031-01-05");
    for (const p of res.body.periods) expect(p.status).toBe("OPEN");
  });

  it("sobreposição aborta tudo (409) sem criar nada", async () => {
    const before = await prisma.billingPeriod.count();
    const res = await gen({ year: 2030, cutDay: 6 });
    expect(res.status).toBe(409);
    expect(res.body.conflicts.length).toBeGreaterThan(0);
    expect(res.body.conflicts[0].conflictsWith.length).toBeGreaterThan(0);
    expect(await prisma.billingPeriod.count()).toBe(before);
  });

  it("corte dia 1 gera meses cheios", async () => {
    const res = await gen({ year: 2032, cutDay: 1 });
    expect(res.status).toBe(201);
    createdIds.push(...res.body.periods.map((p) => p.id));
    expect(res.body.periods[0].label).toBe("Janeiro 2032 - 01/01 a 31/01");
    expect(res.body.periods[1].label).toBe("Fevereiro 2032 - 01/02 a 29/02");
  });
});
