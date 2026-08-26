# Database migrations

The backend uses **versioned Drizzle migrations** instead of `drizzle-kit push`.
Migrations are SQL files under `backend/drizzle/`, applied in order and tracked
in the `drizzle.__drizzle_migrations` table. Unlike `push` (which diffs the
schema and auto-applies, and can silently drop columns), migrations are
reviewable in a PR and never destroy data you didn't ask them to.

## Everyday workflow

1. Edit `backend/src/db/schema.ts`.
2. Generate a migration from the change:
   ```bash
   cd backend && npm run db:generate -- --name=<short_description>
   ```
   This writes a new `NNNN_<name>.sql` under `backend/drizzle/` and updates the
   snapshot in `backend/drizzle/meta/`.
3. **Review the generated SQL.** For destructive or data-moving changes, hand-edit
   the file (backfill columns, guard drops) before it ever runs.
4. Apply it locally against your dev database:
   ```bash
   DATABASE_URL=... npm run db:migrate
   ```
5. Commit the schema change **and** the generated migration together.

## Deploy

Railway runs the migration step before the server boots:

```
node dist/db/migrate.js && node dist/server.js
```

`db:migrate` is safe to run on every deploy — already-applied migrations are
skipped. If a migration fails, the server does not start and the deploy fails
(rather than booting on a half-migrated schema).

## Baseline (0000_baseline.sql)

`0000_baseline.sql` captures the entire schema as it existed when migrations
were adopted. It was hand-edited to be **idempotent** — every `CREATE TABLE` /
`CREATE INDEX` uses `IF NOT EXISTS`, and every `CREATE TYPE` / `ADD CONSTRAINT`
is wrapped in a `DO $$ … EXCEPTION WHEN duplicate_object THEN null … $$` guard.

This makes adoption safe for a database that was previously built with
`drizzle-kit push` (like production): running `db:migrate` against it applies
the baseline as a no-op and records it as applied, without dropping or
recreating anything. On a fresh database the same baseline builds the full
schema. Both paths were verified against a real Postgres instance before this
was shipped.

**Only the baseline is idempotent.** Migrations generated afterward run exactly
once via the tracking table, so they don't need the guards.

## `db:push` is retained for emergencies only

`npm run db:push` still exists for local throwaway databases and emergencies,
but it is no longer part of any deploy. Prefer generate + migrate so every
schema change is captured in version control.
