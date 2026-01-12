# ADR 0001 — SQL-first database migrations (no ORM)

## Status
Accepted

## Context
DocVault is intended to demonstrate strong backend and database fundamentals.
The project requires precise control over:
- schema design
- constraints
- indexes
- transactional behavior
- ownership enforcement

Using an ORM migration engine would abstract away many of these concerns and reduce visibility into the actual database behavior.

## Decision
We use **SQL-first migrations** written manually in `.sql` files.

- Migrations live in `apps/api/migrations/`
- They are applied via scripts in local development and CI
- No ORM is used for schema management or migrations

## Consequences

### Positive
- Full control over schema details (constraints, indexes, triggers).
- Clear, explicit migrations that are easy to review.
- Strong signal of database maturity in a backend portfolio context.
- Avoids hidden ORM behaviors and implicit schema changes.

### Negative
- Requires more discipline and manual effort.
- No automatic migration generation.
- Developers must be comfortable writing SQL.

## Notes
- All integration tests run against a real PostgreSQL database.
- Ownership and access control are enforced at the query level (via `owner_id` scoping).
- This approach aligns with production environments where schema control is critical.
