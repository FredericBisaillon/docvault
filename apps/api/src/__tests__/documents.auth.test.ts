import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../server.js"; // adapte le path

async function createUser(app: any, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/users",
    payload: { email, displayName: "Test User" },
  });

  expect(res.statusCode).toBe(201);
  return res.json().user.id as string;
}

async function createDoc(app: any, userId: string) {
  const res = await app.inject({
    method: "POST",
    url: "/documents",
    headers: { "x-user-id": userId },
    payload: { title: "Doc", content: "v1" },
  });

  expect(res.statusCode).toBe(201);
  return res.json().document.id as string;
}

describe("Documents auth & permissions", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("401 if x-user-id is missing", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/documents",
      payload: { title: "Doc", content: "x" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("401 if x-user-id is invalid UUID", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/documents",
      headers: { "x-user-id": "not-a-uuid" },
      payload: { title: "Doc", content: "x" },
    });

    expect(res.statusCode).toBe(401);
  });

  it("201 create document as owner", async () => {
    const userA = await createUser(app, "userA@example.com");

    const res = await app.inject({
      method: "POST",
      url: "/documents",
      headers: { "x-user-id": userA },
      payload: { title: "My Doc", content: "v1" },
    });

    expect(res.statusCode).toBe(201);

    const body = res.json();
    expect(body.document.owner_id).toBe(userA);
    expect(body.version.version_number).toBe(1);
  });

  it("400 if document id is not UUID (validation)", async () => {
    const userA = await createUser(app, "userA2@example.com");

    const res = await app.inject({
      method: "GET",
      url: "/documents/not-a-uuid",
      headers: { "x-user-id": userA },
    });

    expect(res.statusCode).toBe(400);
  });

  it("404 if accessing document owned by another user (anti-leak)", async () => {
    const userA = await createUser(app, "userA3@example.com");
    const userB = await createUser(app, "userB3@example.com");

    const docId = await createDoc(app, userA);

    const res = await app.inject({
      method: "GET",
      url: `/documents/${docId}`,
      headers: { "x-user-id": userB },
    });

    expect(res.statusCode).toBe(404);
  });

  it("201 creates new version and increments version_number", async () => {
    const userA = await createUser(app, "userA4@example.com");
    const docId = await createDoc(app, userA);

    const v2 = await app.inject({
      method: "POST",
      url: `/documents/${docId}/versions`,
      headers: { "x-user-id": userA },
      payload: { content: "v2" },
    });

    expect(v2.statusCode).toBe(201);
    expect(v2.json().version.version_number).toBe(2);
  });
});
