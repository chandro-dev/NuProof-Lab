import "server-only";

import { StatelessReceiptService } from "@/src/application/stateless-receipt-service";
import { getCanonicalAppUrl } from "@/src/lib/app-url";
import {
  EnvironmentPublicKeyRegistry,
  EnvironmentSigningProvider,
  NodeEd25519Verifier
} from "./crypto/ed25519";

export function getStatelessReceiptService() {
  return new StatelessReceiptService(
    new EnvironmentSigningProvider(),
    new EnvironmentPublicKeyRegistry(),
    new NodeEd25519Verifier(),
    getCanonicalAppUrl()
  );
}
