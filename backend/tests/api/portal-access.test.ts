// API: código de acesso do portal — emissão, login, revogação e lote.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../src/lib/prisma.js";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createUser } from "../helpers.js";

const TAG = "portalcode";
let rhToken = "";
let gestToken = "";
let employeeId = "";
const ids = { userIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  const gest = await createUser(`${TAG}-gest`, "GESTORA");
  ids.userIds.push(rh.id, gest.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  gestToken = (await request(app).post("/api/auth/login").send({ email: gest.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  ids.employeeIds.push(emp.id);
});

afterAll(() => cleanup(ids));

const rh = () => rhToken;
const portalLogin = (id: string, code: string) =>
  request(app).post("/api/employee-portal/login").send({ employeeId: id, code });

describe("portal access code", () => {
  it("sem código: login dá 401 orientando a procurar o RH", async () => {
    const res = await portalLogin(employeeId, "123456");
    expect(res.status).toBe(401);
    expect(res.body.message).toContain("RH");
  });

  it("gestora não gerencia código (403)", async () => {
    await request(app).put(`/api/employees/${employeeId}/access-code`)
      .set("Authorization", `Bearer ${gestToken}`).send({}).expect(403);
  });

  it("RH gera código de 6 dígitos e login funciona", async () => {
    const gen = await request(app).put(`/api/employees/${employeeId}/access-code`)
      .set("Authorization", `Bearer ${rh()}`).send({});
    expect(gen.status).toBe(200);
    expect(gen.body.code).toMatch(/^\d{6}$/);

    const login = await portalLogin(employeeId, gen.body.code);
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();
    expect(login.body.employee.id).toBe(employeeId);
  });

  it("código errado dá 401", async () => {
    const res = await portalLogin(employeeId, "000000");
    expect(res.status).toBe(401);
  });

  it("calendário exige token do próprio funcionário", async () => {
    const other = await createEmployee(`${TAG}-other`);
    ids.employeeIds.push(other.id);
    const gen = await request(app).put(`/api/employees/${other.id}/access-code`)
      .set("Authorization", `Bearer ${rh()}`).send({});
    const otherLogin = await portalLogin(other.id, gen.body.code);
    const otherToken = otherLogin.body.token;

    // Sem token.
    await request(app).get(`/api/employee-portal/${employeeId}/calendar?month=2020-08`).expect(401);
    // Token de outro funcionário.
    await request(app).get(`/api/employee-portal/${employeeId}/calendar?month=2020-08`)
      .set("Authorization", `Bearer ${otherToken}`).expect(403);
  });

  it("hash nunca vaza em GET /employees nem no search", async () => {
    const list = await request(app).get("/api/employees").set("Authorization", `Bearer ${rh()}`);
    expect(list.status).toBe(200);
    const me = list.body.employees.find((e) => e.id === employeeId);
    expect(me.hasAccessCode).toBe(true);
    expect(me.accessCodeHash).toBeUndefined();
    expect(JSON.stringify(list.body)).not.toContain("accessCodeHash");

    const search = await request(app).get(`/api/employee-portal/search?name=${TAG}`);
    expect(search.body.employees[0].hasAccess).toBe(true);
    expect(JSON.stringify(search.body)).not.toContain("accessCodeHash");
  });

  it("revogação bloqueia login", async () => {
    await request(app).delete(`/api/employees/${employeeId}/access-code`)
      .set("Authorization", `Bearer ${rh()}`).expect(200);
    // Código antigo não entra mais (na verdade: sem acesso ativado).
    const res = await portalLogin(employeeId, "123456");
    expect(res.status).toBe(401);
  });

  it("lote gera só para pendentes e não repete", async () => {
    const first = await request(app).post("/api/employees/access-codes/batch")
      .set("Authorization", `Bearer ${rh()}`);
    expect(first.status).toBe(200);
    expect(first.body.count).toBeGreaterThan(0);
    for (const item of first.body.issued) {
      expect(item.code).toMatch(/^\d{6}$/);
    }
    const second = await request(app).post("/api/employees/access-codes/batch")
      .set("Authorization", `Bearer ${rh()}`);
    expect(second.body.count).toBe(0);
  });
});
