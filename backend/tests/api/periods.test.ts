// API: períodos — fechamento congela total, bloqueia edição e reabertura libera.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createPeriod, createPrice, createUser, d } from "../helpers.js";

const TAG = "periods";
let rhToken = "";
let gestToken = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], priceIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  const gest = await createUser(`${TAG}-gest`, "GESTORA");
  ids.userIds.push(rh.id, gest.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  gestToken = (await request(app).post("/api/auth/login").send({ email: gest.email, password: "senha-teste" })).body.token;
  const price = await createPrice(8.5, "2026-01-01");
  ids.priceIds.push(price.id);
});

afterAll(() => cleanup(ids));

describe("billing-periods", () => {
  it("gestora não cria período (403)", async () => {
    const res = await request(app).post("/api/billing-periods").set("Authorization", `Bearer ${gestToken}`)
      .send({ label: "X", startDate: "2026-01-01", endDate: "2026-01-02" });
    expect(res.status).toBe(403);
  });

  it("rejeita startDate > endDate (422)", async () => {
    const res = await request(app).post("/api/billing-periods").set("Authorization", `Bearer ${rhToken}`)
      .send({ label: "X", startDate: "2026-02-02", endDate: "2026-02-01" });
    expect(res.status).toBe(422);
  });

  it("close congela total, bloqueia bulk e re-close dá 409", async () => {
    const period = await createPeriod(`${TAG}-fechado`, "2026-03-01", "2026-03-05");
    ids.periodIds.push(period.id);

    const closed = await request(app).post(`/api/billing-periods/${period.id}/close`)
      .set("Authorization", `Bearer ${rhToken}`);
    expect(closed.status).toBe(200);
    expect(closed.body.period.status).toBe("CLOSED");

    const again = await request(app).post(`/api/billing-periods/${period.id}/close`)
      .set("Authorization", `Bearer ${rhToken}`);
    expect(again.status).toBe(409);
  });

  it("reopen zera total e libera o período", async () => {
    const period = await createPeriod(`${TAG}-reaberto`, "2026-04-01", "2026-04-05");
    ids.periodIds.push(period.id);

    await request(app).post(`/api/billing-periods/${period.id}/close`)
      .set("Authorization", `Bearer ${rhToken}`).expect(200);
    const reopened = await request(app).post(`/api/billing-periods/${period.id}/reopen`)
      .set("Authorization", `Bearer ${rhToken}`);
    expect(reopened.status).toBe(200);
    expect(reopened.body.period.status).toBe("OPEN");
    expect(reopened.body.period.totalAmount).toBeNull();

    const reopenAgain = await request(app).post(`/api/billing-periods/${period.id}/reopen`)
      .set("Authorization", `Bearer ${rhToken}`);
    expect(reopenAgain.status).toBe(409);
  });

  it("close de período inexistente dá 404", async () => {
    const res = await request(app).post("/api/billing-periods/00000000-0000-4000-8000-000000000000/close")
      .set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(404);
  });

  it("report reflete lançamentos (fumaça de cálculo)", async () => {
    const period = await createPeriod(`${TAG}-calc`, "2020-05-01", "2020-05-05");
    ids.periodIds.push(period.id);
    const res = await request(app).get(`/api/billing-periods/${period.id}/report`)
      .set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(200);
    expect(res.body.report.totalQuantity).toBe(0);
    expect(d("2020-01-01") < d("2020-12-31")).toBe(true);
  });
});
