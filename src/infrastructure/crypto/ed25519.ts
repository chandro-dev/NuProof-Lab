import "server-only";

import {
  createPrivateKey,
  createPublicKey,
  sign,
  timingSafeEqual,
  verify
} from "node:crypto";
import type {
  PublicKeyRecord,
  PublicKeyRegistry,
  SignatureVerifier,
  SigningProvider,
  SignatureResult,
  TokenDigester
} from "@/src/domain/ports";
import { createHmac } from "node:crypto";

function normalizePem(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function privateKey(value: string) {
  const normalized = normalizePem(value);
  return normalized.includes("BEGIN")
    ? createPrivateKey(normalized)
    : createPrivateKey({ key: Buffer.from(normalized, "base64"), format: "der", type: "pkcs8" });
}

function publicKey(value: string) {
  const normalized = normalizePem(value);
  return normalized.includes("BEGIN")
    ? createPublicKey(normalized)
    : createPublicKey({ key: Buffer.from(normalized, "base64"), format: "der", type: "spki" });
}

export class EnvironmentSigningProvider implements SigningProvider {
  public activeKeyId(): string {
    const keyId = process.env.NUPROOF_KEY_ID;
    if (!keyId) throw new Error("NUPROOF_KEY_ID is not configured");
    return keyId;
  }

  public async sign(data: Uint8Array): Promise<SignatureResult> {
    const pem = process.env.NUPROOF_PRIVATE_KEY;
    const keyId = this.activeKeyId();
    if (!pem) throw new Error("Server signing key is not configured");
    return {
      keyId,
      signature: sign(null, Buffer.from(data), privateKey(pem)).toString(
        "base64url"
      )
    };
  }
}

export class EnvironmentPublicKeyRegistry implements PublicKeyRegistry {
  private records(): PublicKeyRecord[] {
    const raw = process.env.NUPROOF_PUBLIC_KEYS_JSON;
    if (!raw) throw new Error("NUPROOF_PUBLIC_KEYS_JSON is not configured");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("Public key registry must be an array");
    return parsed.map((record) => {
      const candidate = record as Partial<PublicKeyRecord>;
      if (
        typeof candidate.keyId !== "string" ||
        candidate.algorithm !== "Ed25519" ||
        typeof candidate.publicKey !== "string"
      ) {
        throw new Error("Public key registry contains an invalid record");
      }
      return candidate as PublicKeyRecord;
    });
  }

  public async resolve(keyId: string): Promise<PublicKeyRecord | null> {
    return this.records().find((record) => record.keyId === keyId) ?? null;
  }

  public async list(): Promise<PublicKeyRecord[]> {
    return this.records();
  }
}

export class NodeEd25519Verifier implements SignatureVerifier {
  public async verify(
    data: Uint8Array,
    signature: string,
    publicKeyPem: string
  ): Promise<boolean> {
    try {
      return verify(
        null,
        Buffer.from(data),
        publicKey(publicKeyPem),
        Buffer.from(signature, "base64url")
      );
    } catch {
      return false;
    }
  }
}

export class HmacTokenDigester implements TokenDigester {
  private digestBuffer(token: string): Buffer {
    const pepper = process.env.NUPROOF_TOKEN_PEPPER;
    if (!pepper || pepper.length < 32) {
      throw new Error("NUPROOF_TOKEN_PEPPER must contain at least 32 characters");
    }
    return createHmac("sha256", pepper).update(token, "utf8").digest();
  }

  public digest(token: string): string {
    return this.digestBuffer(token).toString("hex");
  }

  public matches(token: string, expectedDigest: string): boolean {
    const actual = this.digestBuffer(token);
    const expected = Buffer.from(expectedDigest, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}
