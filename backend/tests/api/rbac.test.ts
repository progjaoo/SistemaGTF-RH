// API: RBAC — gestora bloqueada em tudo que é administrativo.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createEmployee, createUser } from "../helpers.js";

const TAG = "rbac";
let gestToken = "";
let rhToken = "";
const ids = { userIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  const gest = await createUser(`${TAG}-gest`, "GESTORA");
  ids.userIds.push(rh.id, gest.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
  gestToken = (await request(app).post("/api/auth/login").send({ email: gest.email, password: "senha-teste" })).body.token;
});

afterAll(() => cleanup(ids));

describe("rbac gestora", () => {
  it("não cria período (403)", async () => {
    await request(app).post("/api/billing-periods").set("Authorization", `Bearer ${gestToken}`)
      .send({ label: "X", startDate: "2020-01-01", endDate: "2020-01-02" }).expect(403);
  });

  it("não lista usuários (403)", async () => {
    await request(app).get("/api/users").set("Authorization", `Bearer ${gestToken}`).expect(403);
  });

  it("não cria usuário (403)", async () => {
    await request(app).post("/api/users").set("Authorization", `Bearer ${gestToken}`)
      .send({ name: "X", email: "x@x.com", password: "123456", role: "GESTORA", active: true }).expect(403);
  });

  it("não cria preço (403)", async () => {
    await request(app).post("/api/meal-prices").set("Authorization", `Bearer ${gestToken}`)
      .send({ value: 10, validFrom: "2020-01-01" }).expect(403);
  });

  it("não cria nem edita funcionário (403)", async () => {
    const emp = await createEmployee(TAG);
    ids.employeeIds.push(emp.id);
    await request(app).post("/api/employees").set("Authorization", `Bearer ${gestToken}`)
      .send({ name: "Y", scheduleType: "MON_FRI" }).expect(403);
    await request(app).put(`/api/employees/${emp.id}`).set("Authorization", `Bearer ${gestToken}`)
      .send({ name: "Y", scheduleType: "MON_FRI" }).expect(403);
  });

  it("RH cria funcionário (201) — controle positivo", async () => {
    const res = await request(app).post("/api/employees").set("Authorization", `Bearer ${rhToken}`)
      .send({ name: `Func ${TAG}-rh`, scheduleType: "MON_FRI" });
    expect(res.status).toBe(201);
    ids.employeeIds.push(res.body.employee.id);
  });

  it("sem token dá 401", async () => {
    await request(app).get("/api/employees").expect(401);
  });
});
