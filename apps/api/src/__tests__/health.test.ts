import { describe, it, expect } from "vitest";
import { buildServer } from "../server.js";

describe("health/ready", () => {
  it("GET /health returns ok", async () => {
    const app = buildServer();

    const res = await app.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });

    await app.close();
  });

  it("GET /docs returns swagger UI", async () => {
    const app = buildServer();

    const res = await app.inject({
      method: "GET",
      url: "/docs",
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("text/html");

    await app.close();
  });
});
