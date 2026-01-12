# DocVault API (`apps/api`)

Fastify + TypeScript backend API for DocVault (versioned documents).

This service is designed as a **portfolio / CV-grade backend** project showcasing:
- SQL-first database design & migrations
- clean layering (routes → repositories → DB)
- strict auth + ownership enforcement (anti-leak)
- real Postgres integration tests (no mocks)
- OpenAPI documentation generated from runtime schemas

---

## Tech

- Node.js 20 + TypeScript
- Fastify
- TypeBox (runtime validation + types)
- Swagger / OpenAPI (`/docs`)
- PostgreSQL (Docker for local dev)
- `pg` (no ORM)

---

## Quick Start (Local)

### 1) Install deps (from repo root)
```bash
pnpm install
```

### 2) Start Postgres (Docker)
```bash
pnpm db:up
```

### 3) Reset DB (migrations + seed)
```bash
pnpm db:reset
```

### 4) Start the API
```bash
pnpm dev
```

API:
- http://localhost:3001

Swagger UI:
- http://localhost:3001/docs

---

## Scripts

- `pnpm dev` — start API in watch mode
- `pnpm db:up` — start Postgres via Docker Compose
- `pnpm db:reset` — reset schema + apply migrations + seed (local)
- `pnpm test:db` — bring DB up, reset, and run integration tests
- `pnpm test` — run tests (assumes DB already in expected state)
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript typecheck (`tsc --noEmit`)

---

## Authentication (dev-only)

DocVault currently uses a **dev-only** auth mechanism.

- All protected routes require header: `x-user-id: <uuid>`
- Missing header → `401`
- Invalid UUID → `401`
- `POST /users` is **public** (signup)
- Ownership is enforced server-side (`ownerId` is never accepted from client bodies)

Example:

Create a user (public):
```bash
curl -s -X POST http://localhost:3001/users \
  -H "content-type: application/json" \
  -d '{"email":"me@example.com","displayName":"Me"}' | jq
```

Create a document (auth required):
```bash
curl -s -X POST http://localhost:3001/documents \
  -H "content-type: application/json" \
  -H "x-user-id: <user-uuid>" \
  -d '{"title":"Doc","content":"Hello"}' | jq
```

---

## Security Model (Permissions)

### User documents listing
`GET /users/:id/documents`
- Allowed only if `x-user-id === :id`
- Otherwise returns `403 FORBIDDEN` (explicit permission error)

### Document ownership
For any endpoint referencing a document id:
- queries are scoped by `owner_id = req.user.id`
- when a document does not belong to the user, the API returns `404` (anti-leak)

This prevents attackers from probing which document ids exist.

---

## Endpoints (high-level)

### Health
- `GET /health`
- `GET /ready`

### Users
- `POST /users` *(public)*
- `GET /users/:id/documents` *(self-only; requires auth; cursor pagination)*

### Documents
- `GET /documents` *(auth; list documents for current user; cursor pagination)*
- `POST /documents` *(auth; creates document + version 1)*
- `GET /documents/:id` *(auth; latest version)*
- `GET /documents/:id/versions` *(auth; list all versions)*
- `POST /documents/:id/versions` *(auth; append version; safe increment)*
- `PATCH /documents/:id` *(auth; rename title; owner-only)*
- `PATCH /documents/:id/archive` *(auth; archive; owner-only)*
- `PATCH /documents/:id/unarchive` *(auth; unarchive; owner-only)*

---

## Pagination (Cursor)

List endpoints support:
- `limit` (1..50)
- `cursor` (opaque string)
- `includeArchived` (`true|false|1|0`)

Examples:

List current user's documents:
```bash
curl -s "http://localhost:3001/documents?limit=10" \
  -H "x-user-id: <user-uuid>" | jq
```

List next page:
```bash
curl -s "http://localhost:3001/documents?limit=10&cursor=<cursor>" \
  -H "x-user-id: <user-uuid>" | jq
```

---

## Testing

Integration tests use a real Postgres DB and validate:
- auth (missing/invalid header)
- access control (403 on user listing, anti-leak 404 on documents)
- listing + renaming endpoints
- versioning behavior

Run:
```bash
pnpm test:db
```

---

## Notes

- Swagger/OpenAPI is generated from TypeBox schemas
- Global error handler normalizes validation errors and internal errors
- The auth mechanism is intentionally minimal and can be swapped for a real provider (e.g., JWT/Cognito) later
