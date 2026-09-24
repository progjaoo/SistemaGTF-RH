// API: ativação do portal + sessão lembrar (30d) vs turno (8h).
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createUser } from "../helpers.js";

const TAG = "activation";
let rhToken = "";
let employeeId = "";
const ids = { userIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  const emp = await createEmployee(TAG);
  employeeId = emp.id;
  ids.employeeIds.push(emp.id);
});

afterAll(() => cleanup(ids));

const genCode = () =>
  request(app).put(`/api/employees/${employeeId}/access-code`)
    .set("Authorization", `Bearer ${rhToken}`).send({});

describe("portal activation", () => {
  it("primeiro login ativa (pending -> active) com sessão de 8h", async () => {
    const gen = await genCode();
    expect(gen.status).toBe(200);
    const login = await request(app).post("/api/employee-portal/login")
      .send({ employeeId, code: gen.body.code });
    expect(login.status).toBe(200);
    expect(login.body.portalStatus).toBe("active");
    const payload = jwt.decode(login.body.token) as { exp: number; iat: number };
    expect(payload.exp - payload.iat).toBe(8 * 3600);
  });

  it("login com remember emite sessão de 30d e mantém ativo", async () => {
    const gen = await genCode();
    const login = await request(app).post("/api/employee-portal/login")
      .send({ employeeId, code: gen.body.code, remember: true });
    expect(login.status).toBe(200);
    expect(login.body.portalStatus).toBe("active");
    const payload = jwt.decode(login.body.token) as { exp: number; iat: number };
    expect(payload.exp - payload.iat).toBe(30 * 24 * 3600);
  });

  it("admin vê portalAccess none/pending/active", async () => {
    const fresh = await createEmployee(`${TAG}-fresh`);
    ids.employeeIds.push(fresh.id);
    const list = await request(app).get("/api/employees").set("Authorization", `Bearer ${rhToken}`);
    const byId = Object.fromEntries(list.body.employees.map((e) => [e.id, e.portalAccess]));
    expect(byId[fresh.id]).toBe("none");
    expect(byId[employeeId]).toBe("active");
  });

  it("inativo não loga mesmo com código", async () => {
    const emp = await createEmployee(`${TAG}-inactive`);
    ids.employeeIds.push(emp.id);
    const gen = await request(app).put(`/api/employees/${emp.id}/access-code`)
      .set("Authorization", `Bearer ${rhToken}`).send({});
    await request(app).delete(`/api/employees/${emp.id}`).set("Authorization", `Bearer ${rhToken}`);
    const login = await request(app).post("/api/employee-portal/login")
      .send({ employeeId: emp.id, code: gen.body.code });
    expect(login.status).toBe(401);
  });
});
