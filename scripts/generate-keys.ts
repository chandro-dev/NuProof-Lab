import { generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const keyId = process.env.NUPROOF_KEY_ID ?? `nuproof-dev-${new Date().toISOString().slice(0, 7)}`;
const pair = generateKeyPairSync("ed25519");
const privateDer = pair.privateKey.export({ format: "der", type: "pkcs8" });
const publicDer = pair.publicKey.export({ format: "der", type: "spki" });
const privatePem = pair.privateKey.export({ format: "pem", type: "pkcs8" });
const publicPem = pair.publicKey.export({ format: "pem", type: "spki" });
const privateBase64 = privateDer.toString("base64");
const publicBase64 = publicDer.toString("base64");
const registry = [{ keyId, algorithm: "Ed25519", publicKey: publicBase64 }];
const directory = path.resolve("keys");
const tokenPepper = randomBytes(32).toString("base64url");
const keyLines = [
  `NUPROOF_KEY_ID=${keyId}`,
  `NUPROOF_PRIVATE_KEY=${privateBase64}`,
  `NUPROOF_PUBLIC_KEYS_JSON='${JSON.stringify(registry)}'`,
  `NUPROOF_TOKEN_PEPPER=${tokenPepper}`
];

mkdirSync(directory, { recursive: true, mode: 0o700 });
writeFileSync(path.join(directory, `${keyId}.private.pem`), privatePem, { mode: 0o600 });
writeFileSync(path.join(directory, `${keyId}.public.pem`), publicPem, { mode: 0o644 });
writeFileSync(path.join(directory, "public-keys.json"), JSON.stringify(registry, null, 2), {
  mode: 0o644
});
writeFileSync(
  path.resolve(".env.keys"),
  [...keyLines, ""].join("\n"),
  { mode: 0o600 }
);
const localEnvPath = path.resolve(".env.local");
if (!existsSync(localEnvPath)) {
  writeFileSync(
    localEnvPath,
    [
      "DATABASE_URL=postgresql://nuproof:nuproof@localhost:5432/nuproof",
      ...keyLines,
      "APP_URL=http://localhost:3000",
      "DEMO_MODE=true",
      `INTERNAL_API_KEY=${randomBytes(32).toString("base64url")}`,
      ""
    ].join("\n"),
    { mode: 0o600 }
  );
}

console.info(`Generated Ed25519 key ${keyId}`);
console.info("Private material: keys/*.private.pem and .env.keys (both ignored by Git)");
console.info("Public registry: keys/public-keys.json");
console.info(
  existsSync(localEnvPath)
    ? "Local environment: .env.local is present"
    : "Local environment: create .env.local from .env.example"
);
