// API: login admin com/sem remember (30d vs 12h).
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../../src/server.js";
import { cleanup, createUser } from "../helpers.js";

const TAG = "authremember";
const ids = { userIds: [] as string[] };
let email = "";

beforeAll(async () => {
  const user = await createUser(TAG, "RH");
  ids.userIds.push(user.id);
  email = user.email;
});

afterAll(() => cleanup(ids));

describe("admin login remember-me", () => {
  it("sem remember expira em 12h", async () => {
    const login = await request(app).post("/api/auth/login").send({ email, password: "senha-teste" });
    expect(login.status).toBe(200);
    const payload = jwt.decode(login.body.token) as { exp: number; iat: number };
    expect(payload.exp - payload.iat).toBe(12 * 3600);
  });

  it("com remember expira em 30d", async () => {
    const login = await request(app).post("/api/auth/login").send({ email, password: "senha-teste", remember: true });
    expect(login.status).toBe(200);
    const payload = jwt.decode(login.body.token) as { exp: number; iat: number };
    expect(payload.exp - payload.iat).toBe(30 * 24 * 3600);
  });
});
