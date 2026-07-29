import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

if (process.env.DEMO_MODE !== "true") {
  throw new Error("Seed is blocked unless DEMO_MODE=true");
}

async function main() {
  const [{ getContainer }, { getPool }] = await Promise.all([
    import("@/src/infrastructure/container"),
    import("@/src/infrastructure/database/client")
  ]);
  try {
    const records = await getContainer().demo.reset();
    console.info(`Seeded ${records.length} fictitious transactions and receipts.`);
  } finally {
    await getPool().end();
  }
}

void main();
