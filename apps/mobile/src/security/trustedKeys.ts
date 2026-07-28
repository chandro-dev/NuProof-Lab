const defaultDevelopmentKey =
  "D8Eyg53qAkmdq3t5Vh-hrVPMVQT4IRqeOGp362OEbcU";

const configuredDevelopmentKey =
  process.env.EXPO_PUBLIC_NUPROOF_ED25519_PUBLIC_KEY?.trim();

const trustedKeys: Readonly<Record<string, string>> = {
  "nuproof-dev-key-2026-01": configuredDevelopmentKey || defaultDevelopmentKey
};

export function getTrustedPublicKey(keyId: string): string | undefined {
  return trustedKeys[keyId];
}

