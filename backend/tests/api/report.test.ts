// API: relatório — formatos JSON/XLSX/PDF derivam do mesmo cálculo.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createPrice, createUser, d } from "../helpers.js";
import { prisma } from "../../src/lib/prisma.js";

const TAG = "report";
let rhToken = "";
let periodId = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], priceIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  ids.employeeIds.push(emp.id);
  const period = await createPeriod(TAG, "2020-09-01", "2020-09-05");
  periodId = period.id;
  ids.periodIds.push(period.id);
  // validFrom dentro do próprio período: vence qualquer global residual de
  // outro arquivo (o banco de teste é compartilhado entre arquivos).
  const price = await createPrice(10, "2020-09-01");
  ids.priceIds.push(price.id);
  await prisma.mealRecord.create({
    data: { employeeId: emp.id, periodId, date: d("2020-09-02"), quantity: 2, registeredById: rh.id }
  });
});

afterAll(() => cleanup(ids));

describe("billing-periods/:id/report", () => {
  it("JSON traz totais (fumaça)", async () => {
    const res = await request(app).get(`/api/billing-periods/${periodId}/report`)
      .set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(200);
    expect(res.body.report.totalQuantity).toBe(2);
    expect(res.body.report.totalAmount).toBe(20);
  });

  it("XLSX tem content-type de planilha", async () => {
    const res = await request(app).get(`/api/billing-periods/${periodId}/report?format=xlsx`)
      .set("Authorization", `Bearer ${rhToken}`).buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c) => chunks.push(c as Buffer));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect((res.body as Buffer).length).toBeGreaterThan(1024);
  });

  it("PDF é válido (%PDF) com content-type correto", async () => {
    const res = await request(app).get(`/api/billing-periods/${periodId}/report?format=pdf`)
      .set("Authorization", `Bearer ${rhToken}`).buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c) => chunks.push(c as Buffer));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect((res.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");
  });
});
