import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../server.js"; // adapte

async function createUser(app: any, email: string) {
  const res = await app.inject({
    method: "POST",
    url: "/users",
    payload: { email, displayName: "Test User" },
  });
  expect(res.statusCode).toBe(201);
  return res.json().user.id as string;
}

async function createDoc(app: any, userId: string, title: string) {
  const res = await app.inject({
    method: "POST",
    url: "/documents",
    headers: { "x-user-id": userId },
    payload: { title, content: "v1" },
  });
  expect(res.statusCode).toBe(201);
  return res.json().document.id as string;
}

describe("GET /documents + PATCH /documents/:id", () => {
  const app = buildServer();

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("GET /documents returns only current user's docs", async () => {
    const userA = await createUser(app, "listA@example.com");
    const userB = await createUser(app, "listB@example.com");

    await createDoc(app, userA, "A1");
    await createDoc(app, userA, "A2");
    await createDoc(app, userB, "B1");

    const res = await app.inject({
      method: "GET",
      url: "/documents?limit=50",
      headers: { "x-user-id": userA },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.items.length).toBeGreaterThanOrEqual(2);
    for (const item of body.items) {
      expect(item.document.owner_id).toBe(userA);
    }
  });

  it("PATCH /documents/:id renames title (owner only)", async () => {
    const userA = await createUser(app, "renameA@example.com");
    const userB = await createUser(app, "renameB@example.com");

    const docId = await createDoc(app, userA, "Old Title");

    // rename as owner
    const rename = await app.inject({
      method: "PATCH",
      url: `/documents/${docId}`,
      headers: { "x-user-id": userA },
      payload: { title: "New Title" },
    });

    expect(rename.statusCode).toBe(200);
    expect(rename.json().document.title).toBe("New Title");

    const renameOther = await app.inject({
      method: "PATCH",
      url: `/documents/${docId}`,
      headers: { "x-user-id": userB },
      payload: { title: "Hacked" },
    });

    expect(renameOther.statusCode).toBe(404);
  });
});
