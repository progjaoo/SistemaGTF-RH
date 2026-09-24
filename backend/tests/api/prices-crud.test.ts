// API: CRUD de preços com status de vigência e trava de histórico.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createPrice, createUser, d } from "../helpers.js";

const TAG = "prices";
let rhToken = "";
let gestToken = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], priceIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  const gest = await createUser(`${TAG}-gest`, "GESTORA");
  ids.userIds.push(rh.id, gest.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  gestToken = (await request(app).post("/api/auth/login").send({ email: gest.email, password: "senha-teste" })).body.token;
});

afterAll(() => cleanup(ids));

describe("meal-prices", () => {
  it("lista com status VIGENTE/FUTURA/ENCERRADA", async () => {
    const past = await createPrice(5, "2020-01-01");
    await prisma.mealPrice.update({ where: { id: past.id }, data: { validTo: d("2020-06-01") } });
    ids.priceIds.push(past.id);
    const future = await createPrice(6, "2099-01-01");
    ids.priceIds.push(future.id);
    const current = await createPrice(7, "2020-01-01");
    ids.priceIds.push(current.id);

    const res = await request(app).get("/api/meal-prices").set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(200);
    const byId = Object.fromEntries(res.body.prices.map((p) => [p.id, p.status]));
    expect(byId[past.id]).toBe("ENCERRADA");
    expect(byId[future.id]).toBe("FUTURA");
    expect(byId[current.id]).toBe("VIGENTE");
  });

  it("PUT com sobreposição no mesmo escopo → 422", async () => {
    const first = await createPrice(8, "2021-01-01");
    ids.priceIds.push(first.id);
    const second = await createPrice(9, "2021-06-01");
    ids.priceIds.push(second.id);

    // Estende o primeiro para dentro da vigência do segundo (mesmo escopo global).
    const res = await request(app).put(`/api/meal-prices/${first.id}`)
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ value: 8, validFrom: "2021-01-01", validTo: "2021-07-01" });
    expect(res.status).toBe(422);
  });

  it("global e individual não conflitam entre si", async () => {
    const emp = await createEmployee(`${TAG}-scope`);
    ids.employeeIds.push(emp.id);
    const scoped = await createPrice(10, "2022-01-01");
    ids.priceIds.push(scoped.id);
    const res = await request(app).put(`/api/meal-prices/${scoped.id}`)
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ value: 10, validFrom: "2022-01-01", validTo: null, employeeId: emp.id });
    expect(res.status).toBe(200);
  });

  it("PUT em preço que cruza período CLOSED → 409", async () => {
    const period = await createPeriod(`${TAG}-closed`, "2023-03-01", "2023-03-31");
    ids.periodIds.push(period.id);
    const price = await createPrice(11, "2023-01-01");
    ids.priceIds.push(price.id);
    await request(app).post(`/api/billing-periods/${period.id}/close`)
      .set("Authorization", `Bearer ${rhToken}`).expect(200);

    const res = await request(app).put(`/api/meal-prices/${price.id}`)
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ value: 99, validFrom: "2023-01-01", validTo: null });
    expect(res.status).toBe(409);
  });

  it("POST /:id/close define validTo e mantém histórico", async () => {
    const price = await createPrice(12, "2024-01-01");
    ids.priceIds.push(price.id);
    const res = await request(app).post(`/api/meal-prices/${price.id}/close`)
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ endDate: "2024-06-30" });
    expect(res.status).toBe(200);
    expect(res.body.price.validTo).toBe("2024-06-30");
    const row = await prisma.mealPrice.findUnique({ where: { id: price.id } });
    expect(row).not.toBeNull();
  });

  it("gestora não edita nem encerra (403)", async () => {
    const price = await createPrice(13, "2025-01-01");
    ids.priceIds.push(price.id);
    await request(app).put(`/api/meal-prices/${price.id}`)
      .set("Authorization", `Bearer ${gestToken}`).send({ value: 13, validFrom: "2025-01-01" }).expect(403);
    await request(app).post(`/api/meal-prices/${price.id}/close`)
      .set("Authorization", `Bearer ${gestToken}`).send({ endDate: "2025-06-30" }).expect(403);
  });
});
