# ADR 0002 — Fastify + TypeBox + OpenAPI

## Status
Accepted

## Context
The API must provide:
- runtime request validation
- strong typing
- clear and accurate documentation
- minimal duplication between validation and documentation

The project should also expose a recruiter-friendly `/docs` endpoint that reflects the actual runtime behavior of the API.

## Decision
We use the following stack:
- **Fastify** as the HTTP server
- **TypeBox** for runtime schemas and type inference
- **Swagger / OpenAPI** generated directly from TypeBox schemas

Schemas are defined at the route level and serve as the single source of truth for:
- request validation
- response shapes
- OpenAPI documentation

## Consequences

### Positive
- Runtime validation is guaranteed at the HTTP boundary.
- OpenAPI documentation is always in sync with actual routes.
- Strong typing without duplicating interfaces.
- Clear and explicit API contracts.

### Negative
- Requires discipline to define schemas for all routes and responses.
- Error handling must be standardized to avoid inconsistencies.
- Slightly more verbose than using implicit typing alone.

## Notes
- Validation errors are handled globally by the Fastify error handler.
- Authentication is enforced via a `preHandler` hook at the HTTP boundary.
- This design makes it easy to swap the auth mechanism later (e.g., JWT, OAuth).
