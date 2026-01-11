#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${DB_CONTAINER_NAME:-docvault-db}"
DB_USER="${DB_USER:-docvault}"
DB_NAME="${DB_NAME:-docvault}"

echo "==> Ensuring DB container is running..."
docker compose up -d db

echo "==> Dropping & recreating database '${DB_NAME}'..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d postgres <<SQL
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';
DROP DATABASE IF EXISTS ${DB_NAME};
CREATE DATABASE ${DB_NAME};
SQL

echo "==> Applying migrations..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < migrations/001_init.sql
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < migrations/003_api_keys.sql


echo "==> Seeding database..."
docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < migrations/seed.sql

echo "DB reset + migrate + seed complete."
