// API: campo função (jobTitle) editável no CRUD de funcionários.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createUser } from "../helpers.js";

const TAG = "jobtitle";
let rhToken = "";
const ids = { userIds: [] as string[], employeeIds: [] as string[] };

beforeAll(async () => {
  const rh = await createUser(`${TAG}-rh`, "RH");
  ids.userIds.push(rh.id);
  rhToken = (await request(app).post("/api/auth/login").send({ email: rh.email, password: "senha-teste" })).body.token;
});

afterAll(() => cleanup(ids));

describe("employees jobTitle", () => {
  it("POST cria com jobTitle e retorna no corpo (201)", async () => {
    const res = await request(app).post("/api/employees")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ name: "Func Cargo", scheduleType: "MON_FRI", jobTitle: "Cozinheira" });
    expect(res.status).toBe(201);
    expect(res.body.employee.jobTitle).toBe("Cozinheira");
    ids.employeeIds.push(res.body.employee.id);
  });

  it("PUT edita jobTitle (200) e GET lista expõe", async () => {
    const created = await request(app).post("/api/employees")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ name: "Func Cargo 2", scheduleType: "MON_FRI" });
    expect(created.status).toBe(201);
    ids.employeeIds.push(created.body.employee.id);

    const updated = await request(app).put(`/api/employees/${created.body.employee.id}`)
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ name: "Func Cargo 2", scheduleType: "MON_FRI", jobTitle: "Auxiliar" });
    expect(updated.status).toBe(200);
    expect(updated.body.employee.jobTitle).toBe("Auxiliar");

    const listed = await request(app).get("/api/employees?search=Func Cargo 2")
      .set("Authorization", `Bearer ${rhToken}`);
    expect(listed.status).toBe(200);
    const row = listed.body.employees.find((e: { id: string }) => e.id === created.body.employee.id);
    expect(row.jobTitle).toBe("Auxiliar");
  });

  it("ausente vira null e acima de 60 caracteres dá 422", async () => {
    const res = await request(app).post("/api/employees")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ name: "Func Sem Cargo", scheduleType: "MON_FRI" });
    expect(res.status).toBe(201);
    expect(res.body.employee.jobTitle).toBeNull();
    ids.employeeIds.push(res.body.employee.id);

    const tooLong = await request(app).post("/api/employees")
      .set("Authorization", `Bearer ${rhToken}`)
      .send({ name: "Func Cargo Longo", scheduleType: "MON_FRI", jobTitle: "x".repeat(61) });
    expect(tooLong.status).toBe(422);
  });
});
