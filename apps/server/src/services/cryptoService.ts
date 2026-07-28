import {
  createHash,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject
} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { CanonicalReceiptPayload } from "@nuproof/shared";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function normalize(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(normalize);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, normalize(value[key] as JsonValue)])
    );
  }
  if (typeof value === "number" && !Number.isSafeInteger(value)) {
    throw new Error("Canonical numeric values must be safe integers");
  }
  return value;
}

export function canonicalizePayload(payload: CanonicalReceiptPayload): string {
  return JSON.stringify(normalize(payload as unknown as JsonValue));
}

export function hashPayload(canonicalPayload: string): string {
  return createHash("sha256").update(canonicalPayload, "utf8").digest("hex");
}

export function signReceipt(canonicalPayload: string, privateKey: KeyObject): string {
  return sign(null, Buffer.from(canonicalPayload, "utf8"), privateKey).toString("base64url");
}

export function verifyReceiptSignature(
  canonicalPayload: string,
  signature: string,
  publicKey: KeyObject
): boolean {
  try {
    return verify(
      null,
      Buffer.from(canonicalPayload, "utf8"),
      publicKey,
      Buffer.from(signature, "base64url")
    );
  } catch {
    return false;
  }
}

export interface SigningKeys {
  privateKey: KeyObject;
  publicKey: KeyObject;
  publicKeyPem: string;
}

export function loadOrCreateSigningKeys(keysDir: string): SigningKeys {
  fs.mkdirSync(keysDir, { recursive: true, mode: 0o700 });
  const privatePath = path.join(keysDir, "ed25519-private.pem");
  const publicPath = path.join(keysDir, "ed25519-public.pem");

  if (!fs.existsSync(privatePath) || !fs.existsSync(publicPath)) {
    const pair = generateKeyPairSync("ed25519");
    fs.writeFileSync(
      privatePath,
      pair.privateKey.export({ format: "pem", type: "pkcs8" }),
      { mode: 0o600 }
    );
    fs.writeFileSync(publicPath, pair.publicKey.export({ format: "pem", type: "spki" }), {
      mode: 0o644
    });
  }

  const privateKey = fs.readFileSync(privatePath);
  const publicKeyPem = fs.readFileSync(publicPath, "utf8");
  const { createPrivateKey, createPublicKey } = require("node:crypto") as typeof import("node:crypto");
  return {
    privateKey: createPrivateKey(privateKey),
    publicKey: createPublicKey(publicKeyPem),
    publicKeyPem
  };
}

