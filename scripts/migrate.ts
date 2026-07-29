import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const [{ migrate }, { getDatabase, getPool }] = await Promise.all([
    import("drizzle-orm/node-postgres/migrator"),
    import("@/src/infrastructure/database/client")
  ]);
  try {
    await migrate(getDatabase(), { migrationsFolder: "./drizzle" });
    console.info("PostgreSQL migrations applied.");
  } finally {
    await getPool().end();
  }
}

void main();
