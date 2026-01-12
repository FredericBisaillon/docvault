# DocVault

DocVault is a CV-grade backend project: a versioned document API with a strong focus on clean architecture, correctness, and security fundamentals (auth, ownership, anti-leak), backed by PostgreSQL and tested with real DB integration tests.

## Features

- **Users**
  - Create users (signup)
  - List documents for a user (self-only access control)
- **Documents**
  - Create a document with **version 1**
  - Read latest version
  - List versions
  - Append new versions with safe version increments
  - Archive / unarchive
  - Rename document title
  - List documents for authenticated user (cursor pagination)
- **Security (dev-only auth)**
  - Auth via `x-user-id` header (UUID validation)
  - Ownership enforced server-side (no `ownerId` in request bodies)
  - Anti-leak behavior on document access (returns 404 when not owned)
  - `GET /users/:id/documents` is **self-only** (403 if not the same user)
- **API documentation**
  - OpenAPI (Swagger) generated from TypeBox schemas
  - Swagger UI available at `/docs`
- **Tests**
  - Vitest integration tests hitting a real Postgres DB (no mocks)
  - Covers auth, access control, listing, renaming, versioning

## Tech Stack

- **Monorepo**: Turborepo + pnpm
- **Backend**: Node.js 20, TypeScript, Fastify
- **Validation & OpenAPI**: TypeBox + Swagger
- **Database**: PostgreSQL
- **Migrations**: SQL-first migrations (`migrations/*.sql`)
- **Testing**: Vitest (DB integration tests)

## Architecture

```text
Request
  |
  | 1) Fastify route match (TypeBox schema validation)
  v
Fastify Route Handler
  |
  | 2) preHandler auth (dev-only)
  |    - requires x-user-id
  |    - validates UUID
  |    - injects req.user.id
  v
Repository / DAL
  |
  | 3) DB access via pg pool
  |    - queries always scoped by owner_id
  |    - anti-leak: non-owned doc => 404
  |    - versioning uses transaction + row lock
  v
PostgreSQL
```

## Database Schema (simplified)

```text
┌──────────────────────┐
│        users         │
│──────────────────────│
│ id (uuid, pk)        │
│ email (unique)       │
│ display_name         │
│ created_at           │
│ updated_at           │
└───────────┬──────────┘
            │ 1
            │
            │ N
┌───────────▼──────────┐
│      documents       │
│──────────────────────│
│ id (uuid, pk)        │
│ owner_id (fk → users.id)
│ title                │
│ is_archived          │
│ created_at           │
│ updated_at           │
└───────────┬──────────┘
            │ 1
            │
            │ N
┌───────────▼──────────┐
│  document_versions   │
│──────────────────────│
│ id (uuid, pk)        │
│ document_id (fk → documents.id)
│ version_number       │
│ content              │
│ created_at           │
└──────────────────────┘
```

**Notes**
- Each document belongs to exactly one user (`owner_id`)
- A document has multiple immutable versions
- Version numbers are incremented safely using transactions and row-level locks
- Ownership is enforced at query level (`owner_id` scoping)


## Repository Structure

- `apps/api` — Fastify API service
- `apps/api/migrations` — SQL migrations + seed
- `apps/api/src/routes` — HTTP routes
- `apps/api/src/repositories` — DB access layer (SQL queries via `pg`)
- `apps/api/src/__tests__` — integration tests (real DB)
- `docs/adr` — Architecture Decision Records

## Quick Start

### 1) Install dependencies
```bash
pnpm install
```

### 2) Start Postgres (local)
```bash
pnpm --filter api db:up
```

### 3) Reset DB (migrations + seed)
```bash
pnpm --filter api db:reset
```

### 4) Start the API
```bash
pnpm --filter api dev
```

The API will be available at:
- http://localhost:3001

Swagger UI:
- http://localhost:3001/docs

## Run tests

### Local DB integration tests
```bash
pnpm --filter api test:db
```

## Authentication (dev-only)

This project currently uses a **dev-only auth mechanism** for simplicity:

- Send the header: `x-user-id: <uuid>`
- Requests without this header (or invalid UUID) are rejected with 401
- `POST /users` is public

Example:
```bash
curl -s -X POST http://localhost:3001/documents \
  -H "content-type: application/json" \
  -H "x-user-id: <YOUR-USER-UUID>" \
  -d '{"title":"Doc","content":"Hello"}'
```

## Notes

This project is designed as a strong backend portfolio piece:
- SQL-first migrations
- strict ownership and anti-leak access control
- real DB integration tests
- OpenAPI-driven schemas and documentation
