import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../server.js";

describe("users", () => {
  const app = buildServer();

  beforeAll(async () => {
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects invalid body (validation)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/users",
      payload: { email: "not-an-email", displayName: "" },
    });

    expect(res.statusCode).toBe(400);
    const body = res.json();
    expect(body.error).toBe("validation_error");
  });

  it("creates a user", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/users",
      payload: { email: "vitest1@example.com", displayName: "Vitest 1" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe("vitest1@example.com");
    expect(body.user.display_name).toBe("Vitest 1");
  });

  it("rejects duplicate email", async () => {
    await app.inject({
      method: "POST",
      url: "/users",
      payload: { email: "vitest2@example.com", displayName: "Vitest 2" },
    });

    const res2 = await app.inject({
      method: "POST",
      url: "/users",
      payload: { email: "vitest2@example.com", displayName: "Vitest 2" },
    });

    expect(res2.statusCode).toBe(409);
    expect(res2.json()).toEqual({ error: "email already exists" });
  });
});
