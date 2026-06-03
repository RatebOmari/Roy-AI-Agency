import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is not set");

export const sqlClient = postgres(connectionString, {
  max: parseInt(process.env.DB_POOL_SIZE ?? "20"),
});
export const db = drizzle(sqlClient, { schema });
export type DB = typeof db;
