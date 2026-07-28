import path from "node:path";

export interface AppConfig {
  port: number;
  host: string;
  databasePath: string;
  keysDir: string;
  keyId: string;
}

export function loadConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    port: overrides.port ?? Number(process.env.PORT ?? 3000),
    host: overrides.host ?? process.env.HOST ?? "0.0.0.0",
    databasePath:
      overrides.databasePath ??
      path.resolve(process.cwd(), process.env.DATABASE_PATH ?? "data/nuproof.sqlite"),
    keysDir:
      overrides.keysDir ?? path.resolve(process.cwd(), process.env.KEYS_DIR ?? "data/keys"),
    keyId: overrides.keyId ?? process.env.KEY_ID ?? "nuproof-dev-key-2026-01"
  };
}

