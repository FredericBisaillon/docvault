import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../server.js";

async function createUser(app: any, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/users",
    payload: { email, displayName: "Test User" },
  });

  expect(res.statusCode).toBe(201);
  return res.json().user.id as string;
}

async function createDoc(app: any, userId: string, title = "Doc", content = "v1") {
  const res = await app.inject({
    method: "POST",
    url: "/documents",
    headers: { "x-user-id": userId },
    payload: { title, content },
  });

  expect(res.statusCode).toBe(201);
  return res.json().document.id as string;
}

describe("Users documents access control", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("401 if missing x-user-id on protected route", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/users/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/documents",
    });

    expect(res.statusCode).toBe(401);
  });

  it("403 if user tries to access another user's documents", async () => {
    const userA = await createUser(app, "permA@example.com");
    const userB = await createUser(app, "permB@example.com");

    const res = await app.inject({
      method: "GET",
      url: `/users/${userA}/documents`,
      headers: { "x-user-id": userB },
    });

    expect(res.statusCode).toBe(403);
  });

  it("200 and returns items for self", async () => {
    const userA = await createUser(app, "permC@example.com");

    await createDoc(app, userA, "My Doc 1", "hello");
    await createDoc(app, userA, "My Doc 2", "world");

    const res = await app.inject({
      method: "GET",
      url: `/users/${userA}/documents?limit=10`,
      headers: { "x-user-id": userA },
    });

    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBeGreaterThanOrEqual(2);

    for (const item of body.items) {
      expect(item.document.owner_id).toBe(userA);
      expect(item.latestVersion.version_number).toBeGreaterThanOrEqual(1);
    }
  });
});
