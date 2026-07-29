import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __nuproofPool: Pool | undefined;
  var __nuproofDatabase: ReturnType<typeof createDatabase> | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  return new Pool({
    connectionString,
    max: process.env.NODE_ENV === "production" ? 5 : 10,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 5_000
  });
}

function createDatabase(pool: Pool) {
  return drizzle(pool, { schema });
}

export function getPool(): Pool {
  const pool = globalThis.__nuproofPool ?? createPool();
  if (process.env.NODE_ENV !== "production") globalThis.__nuproofPool = pool;
  return pool;
}

export function getDatabase() {
  const database = globalThis.__nuproofDatabase ?? createDatabase(getPool());
  if (process.env.NODE_ENV !== "production") globalThis.__nuproofDatabase = database;
  return database;
}

export type Database = ReturnType<typeof getDatabase>;
