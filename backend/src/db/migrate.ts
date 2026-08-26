import "dotenv/config";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

// Applies any pending SQL migrations in ./drizzle to the database, tracked in
// the drizzle.__drizzle_migrations table. Replaces `drizzle-kit push` as the
// deploy-time schema step: migrations are versioned, reviewable, and never
// silently drop columns the way a push diff can. Safe to run on every deploy —
// already-applied migrations are skipped.
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);

migrate(db, { migrationsFolder: "./drizzle" })
  .then(() => { console.log("[migrate] up to date"); return sql.end(); })
  .then(() => process.exit(0))
  .catch((err) => { console.error("[migrate] failed:", err); process.exit(1); });
