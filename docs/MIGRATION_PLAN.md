# NuProof Lab migration plan

## Current-state inventory

The repository currently uses npm workspaces:

- `apps/mobile`: Expo SDK 57, React Native, Expo Router, NativeWind, Expo Camera,
  AsyncStorage and a web export.
- `apps/server`: Express 5, synchronous `node:sqlite`, Ed25519 through
  `node:crypto`, in-process rate limiting and REST endpoints under `/api`.
- `packages/shared`: Zod contracts, transaction states, receipt payload types and
  deterministic JSON canonicalization.

The current PoC already demonstrates:

- fictitious transaction creation and automatic receipt issuance;
- Ed25519 signing and SHA-256 hashing;
- QR generation and camera scanning;
- valid, tampered, copied-QR, unknown-ID, invalid-token and reversed-state cases;
- audit events and demo reset;
- server, API, cryptography and portable-verification tests.

## Reuse decisions

| Existing capability | Migration decision |
| --- | --- |
| Transaction state vocabulary | Keep in the domain layer |
| Integer amount representation | Rename to `amountMinor` and document COP minor units |
| Canonical JSON sorting | Keep as a pure domain/cryptography function |
| Ed25519 and SHA-256 test vectors | Port and expand |
| Verification result semantics | Split authentic receipt state from current transaction state |
| Demo fixtures and fraud story | Port to seed data and Security Lab |
| Express HTTP handlers | Replace with thin Next.js Route Handlers |
| SQLite access and row-shaped domain models | Replace with repository interfaces and Drizzle/PostgreSQL |
| Expo UI components | Rebuild as semantic React/Tailwind web components |

## Security corrections

The current implementation has several boundaries that are unsuitable for the
target architecture:

1. Portable verification and a trusted public-key registry live in the mobile
   bundle. The final application will perform authoritative verification through
   the backend API only.
2. SQLite stores the bearer verification token in plaintext. PostgreSQL will
   store only an HMAC-SHA-256 token digest and compare fixed-length digests in
   constant time.
3. The server creates a private key on its local filesystem. The replacement
   signing provider loads server-only key material from environment variables;
   the development generator writes ignored PEM files for local setup.
4. Transactions and receipts are created in one operation. The replacement has
   distinct transaction creation and receipt issuance use cases.
5. The rate limiter is coupled to Express and process memory. It becomes a
   replaceable `RateLimitService`; the in-memory implementation remains PoC-only.
6. Internal endpoints have no explicit authorization boundary. Demo/internal
   routes will require demo mode and a same-origin/internal access policy, with
   production controls documented.

## Component replacement map

| Expo / current component | Next.js replacement |
| --- | --- |
| Expo Router screens | Next.js App Router pages and layouts |
| React Native primitives | Semantic HTML and React components |
| NativeWind | Tailwind CSS |
| `expo-camera` scanner | `getUserMedia` through `@zxing/browser` |
| `react-native-qrcode-svg` | Web QR component |
| AsyncStorage verification history | Server audit events; non-sensitive transient browser state only |
| Mobile API client | Typed client in `src/lib/api` |
| Client-side portable cryptography | Server-only verification application service |
| Express `/api/*` | Next Route Handlers under `/api/v1/*` |
| `node:sqlite` | Drizzle ORM over PostgreSQL |
| SQLite schema initialization | Versioned SQL migrations |
| Filesystem-generated runtime key | `SigningProvider` backed by environment-managed PEM |

## Target boundaries

```text
app + components
        |
        v
src/lib/api (browser HTTP client)
        |
        v
app/api/v1 (HTTP adapters)
        |
        v
src/application (use cases)
        |
        v
src/domain (entities, policies, ports)
        |
        v
src/infrastructure (Drizzle, PostgreSQL, Ed25519, logging)
```

`src/domain` and `src/application` must not import React, Next.js, Drizzle or
PostgreSQL. Route handlers must not contain SQL, signing operations or business
rules. Modules that touch `DATABASE_URL` or private key material must import
`server-only`.

## Progressive migration

1. Establish Next.js, strict TypeScript, Tailwind and security headers.
2. Add domain models, errors and repository/provider ports.
3. Add PostgreSQL schema, Drizzle repositories, migrations, Docker Compose and
   seed tooling.
4. Port canonicalization, hashing, signing and the public-key registry behind
   server-only providers.
5. Implement transaction, receipt, verification, audit and demo use cases.
6. Expose thin, validated `/api/v1` handlers and stable error contracts.
7. Prove the backend with unit, integration and security tests.
8. Rebuild the public verifier, issuer simulator, receipts, audit and Security
   Lab as responsive web pages.
9. Add browser QR generation/scanning and Playwright flows.
10. Remove `apps/mobile`, `apps/server`, `packages/shared` and all Expo,
    React Native, NativeWind, Express and SQLite dependencies only after their
    replacements build and pass tests.

## Legacy removal gate

Legacy code can be deleted only when all of these are true:

- Next.js production build succeeds.
- PostgreSQL migrations and seed scripts are present and tested.
- API tests prove issue, verify, tamper, invalid token, unknown receipt and
  reversed transaction behavior.
- The web UI can complete the issuer-to-verifier flow.
- Security Lab executes real cryptographic verification.
- QR scanning has a manual-code fallback.
- Vercel configuration uses `DATABASE_URL` and server-only key variables.

## Known migration risks

- Serverless process memory cannot provide distributed rate limiting. The PoC
  adapter is explicitly replaceable; production needs Redis or an edge/WAF limit.
- Database tampering tests need an isolated PostgreSQL database and must never
  target production.
- Verification URLs contain bearer tokens. They must not be logged, indexed or
  sent in referrers; verification pages use a no-referrer policy.
- Key rotation requires retaining public keys for every issued receipt key ID.
- Demo reset and issuer operations are dangerous in a real deployment and must
  remain disabled unless `DEMO_MODE=true`.
