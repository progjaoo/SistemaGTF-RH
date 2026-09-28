// API: relatório por intervalo (cruza períodos) — JSON/XLSX/PDF do mesmo cálculo.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createPrice, createUser, d } from "../helpers.js";
import { prisma } from "../../src/lib/prisma.js";

const TAG = "rreport";
let rhToken = "";
let employeeId = "";
const ids = { userIds: [] as string[], periodIds: [] as string[], priceIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  ids.employeeIds.push(emp.id);
  const periodA = await createPeriod(`${TAG}-a`, "2021-08-01", "2021-08-31");
  const periodB = await createPeriod(`${TAG}-b`, "2021-09-01", "2021-09-30");
  ids.periodIds.push(periodA.id, periodB.id);
  // validFrom dentro do próprio intervalo: vence qualquer global residual de
  // outro arquivo (o banco de teste é compartilhado entre arquivos).
  const price = await createPrice(10, "2021-08-01");
  ids.priceIds.push(price.id);
  await prisma.mealRecord.create({
    data: { employeeId, periodId: periodA.id, date: d("2021-08-31"), quantity: 1, confirmationStatus: "PEGUEI", registeredById: rh.id }
  });
  await prisma.mealRecord.create({
    data: { employeeId, periodId: periodB.id, date: d("2021-09-01"), quantity: 1, confirmationStatus: "PEGUEI", registeredById: rh.id }
  });
  await prisma.mealRecord.create({
    data: { employeeId, periodId: periodB.id, date: d("2021-09-02"), quantity: 1, confirmationStatus: "NAO_PEGUEI", registeredById: rh.id }
  });
});

afterAll(() => cleanup(ids));

const rangeUrl = (query: string) => `/api/reports${query}`;

const asBuffer = (r: { on: (e: string, cb: (c: unknown) => void) => void }, cb: (err: unknown, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  r.on("data", (c) => chunks.push(c as Buffer));
  r.on("end", () => cb(null, Buffer.concat(chunks)));
};

describe("reports por intervalo", () => {
  it("JSON cruza períodos somando só PEGUEI", async () => {
    const res = await request(app).get(rangeUrl("?start=2021-08-30&end=2021-09-02"))
      .set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(200);
    expect(res.body.report.totalQuantity).toBe(2);
    expect(res.body.report.totalAmount).toBe(20);
    expect(res.body.report.period.id).toBe("range");
    expect(res.body.report.period.label).toBe("30/08/2021 a 02/09/2021");
    expect(res.body.report.period.startDate).toBe("2021-08-30");
    expect(res.body.report.period.endDate).toBe("2021-09-02");
    expect(res.body.report.period.status).toBe("OPEN");
  });

  it("XLSX tem content-type de planilha e filename do intervalo", async () => {
    const res = await request(app).get(rangeUrl("?start=2021-08-30&end=2021-09-02&format=xlsx"))
      .set("Authorization", `Bearer ${rhToken}`).buffer(true).parse(asBuffer);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("spreadsheetml");
    expect(res.headers["content-disposition"]).toContain("relatorio_20210830_a_20210902.xlsx");
    expect((res.body as Buffer).length).toBeGreaterThan(1024);
  });

  it("PDF é válido (%PDF) e filename do intervalo", async () => {
    const res = await request(app).get(rangeUrl("?start=2021-08-30&end=2021-09-02&format=pdf"))
      .set("Authorization", `Bearer ${rhToken}`).buffer(true).parse(asBuffer);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(res.headers["content-disposition"]).toContain("relatorio_20210830_a_20210902.pdf");
    expect((res.body as Buffer).subarray(0, 4).toString()).toBe("%PDF");
  });

  it("start > end dá 422", async () => {
    const res = await request(app).get(rangeUrl("?start=2021-09-02&end=2021-08-30"))
      .set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(422);
  });

  it("intervalo acima de 366 dias dá 422 (366 exatos passa)", async () => {
    const over = await request(app).get(rangeUrl("?start=2020-01-01&end=2021-01-02"))
      .set("Authorization", `Bearer ${rhToken}`);
    expect(over.status).toBe(422);
    const edge = await request(app).get(rangeUrl("?start=2020-01-01&end=2021-01-01"))
      .set("Authorization", `Bearer ${rhToken}`);
    expect(edge.status).toBe(200);
  });
});
