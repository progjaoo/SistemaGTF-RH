// API: relatório — formatos JSON/XLSX/PDF derivam do mesmo cálculo.
import ExcelJS from "exceljs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createPeriod, createPrice, createUser, d, pdfTextOf } from "../helpers.js";
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
    data: { employeeId: emp.id, periodId, date: d("2020-09-02"), quantity: 2, confirmationStatus: "PEGUEI", registeredById: rh.id }
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

  it("JSON traz dailyMatrix contínua (PLAN-012 Task 1)", async () => {
    const res = await request(app).get(`/api/billing-periods/${periodId}/report`)
      .set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(200);
    const matrix = res.body.report.dailyMatrix;
    // Período 2020-09-01 → 2020-09-05: calendário contínuo, inclusive sem lançamento.
    expect(matrix).toHaveLength(5);
    expect(matrix.map((day: { date: string }) => day.date)).toEqual([
      "2020-09-01", "2020-09-02", "2020-09-03", "2020-09-04", "2020-09-05"
    ]);
    // Rótulos pt-BR: 01/09/2020 = terça; 05/09/2020 = sábado.
    expect(matrix.map((day: { weekdayLabel: string }) => day.weekdayLabel)).toEqual([
      "Ter", "Qua", "Qui", "Sex", "Sáb"
    ]);
    expect(matrix.map((day: { dayOfWeek: number }) => day.dayOfWeek)).toEqual([2, 3, 4, 5, 6]);
    expect(matrix.map((day: { isWeekend: boolean }) => day.isWeekend)).toEqual([
      false, false, false, false, true
    ]);
    // Dia com lançamento: célula por employeeId, total PEGUEI-only + bruto + valor.
    const empId = ids.employeeIds[0];
    const wed = matrix[1];
    expect(wed.totalQuantity).toBe(2);
    expect(wed.totalRawQuantity).toBe(2);
    expect(wed.amount).toBe(20);
    expect(wed.entries[empId]).toEqual({ quantity: 2, confirmationStatus: "PEGUEI" });
    // Dia sem lançamento: neutro, sem entries.
    expect(matrix[0]).toMatchObject({ totalQuantity: 0, totalRawQuantity: 0, amount: 0, entries: {} });
    // Totais existentes inalterados.
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

  it("XLSX PLAN-012 Task 2: 3 abas da gestora com fórmulas SUM reais (ExcelJS)", async () => {
    const res = await request(app).get(`/api/billing-periods/${periodId}/report?format=xlsx`)
      .set("Authorization", `Bearer ${rhToken}`).buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c) => chunks.push(c as Buffer));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(res.body as Buffer);
    expect(workbook.worksheets.map((ws) => ws.name)).toEqual([
      "Fechamento Folha", "Grade Diária", "Estatísticas"
    ]);
    const folha = workbook.getWorksheet("Fechamento Folha")!;
    expect(String(folha.getCell("A1").value)).toContain("GTF");
    expect(sumFormulasIn(folha).length).toBeGreaterThanOrEqual(2);
    const grade = workbook.getWorksheet("Grade Diária")!;
    expect(String(grade.getCell("A1").value)).toContain("GTF");
    expect(sumFormulasIn(grade).length).toBeGreaterThanOrEqual(1);
    const stats = workbook.getWorksheet("Estatísticas")!;
    expect(String(stats.getCell("A1").value)).toContain("Estatísticas");
    expect(textInColumnA(stats)).toContain("Taxa de adesão ao portal (%)");
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

  it("PDF profissional PLAN-013 Task 5: faixa Genesis, label, nome e Total geral", async () => {
    const res = await request(app).get(`/api/billing-periods/${periodId}/report?format=pdf`)
      .set("Authorization", `Bearer ${rhToken}`).buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on("data", (c) => chunks.push(c as Buffer));
        r.on("end", () => cb(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    const buf = res.body as Buffer;
    expect(buf.subarray(0, 4).toString()).toBe("%PDF");
    // Faixa de identidade maior que o cabeçalho simples anterior.
    expect(buf.length).toBeGreaterThan(2500);
    const text = pdfTextOf(buf);
    expect(text).toContain("GTF");
    expect(text).toContain("Fechamento de Folha");
    expect(text).toContain("Período report");
    expect(text).toContain("Func report");
    expect(text).toContain("Total geral");
    expect(text).toContain("R$ 20,00");
    expect(text).toContain("colaborador");
  });

  it("HTML traz prévia com os mesmos totais", async () => {
    const res = await request(app).get(`/api/billing-periods/${periodId}/report?format=html`)
      .set("Authorization", `Bearer ${rhToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");
    expect(res.text).toContain("<table>");
    expect(res.text).toContain("Total geral");
  });
});

// PLAN-012 Task 2: helpers de inspeção do buffer XLSX via ExcelJS.
function sumFormulasIn(sheet: ExcelJS.Worksheet): string[] {
  const found: string[] = [];
  sheet.eachRow((row) => row.eachCell((cell) => {
    const value = cell.value as { formula?: unknown } | null | undefined;
    if (value && typeof value === "object" && typeof value.formula === "string"
      && value.formula.toUpperCase().startsWith("SUM(")) {
      found.push(value.formula);
    }
  }));
  return found;
}

function textInColumnA(sheet: ExcelJS.Worksheet): string {
  const texts: string[] = [];
  sheet.getColumn(1).eachCell((cell) => {
    if (cell.value !== null && cell.value !== undefined) texts.push(String(cell.value));
  });
  return texts.join("\n");
}
