# Architecture

NuProof Lab is a modular monolith inside one Next.js deployment.

```text
Browser
  -> app/components (presentation)
  -> src/lib/api (HTTP client)
  -> app/api/v1 (HTTP adapters)
  -> src/application (use cases)
  -> src/domain (models, rules, ports)
  -> src/infrastructure (PostgreSQL, crypto, logging, rate limiting)
```

## Dependency rules

- Domain and application code never import React or Route Handlers.
- Route Handlers validate/authorize input, call one service and map the response.
- SQL exists only in Drizzle infrastructure.
- `DATABASE_URL`, signing providers and private material are imported only by
  modules marked `server-only`.
- Client components are limited to forms, scanner, runtime QR and interactive
  results.

## Core flows

### Transaction

`POST /api/v1/transactions` validates integer minor units. The backend owns the
UUID, sender alias, timestamps and initial settled state.

### Receipt

`POST /api/v1/transactions/:id/receipts` snapshots protected transaction fields,
generates a random token, hashes the token with a server pepper, canonicalizes
the receipt, hashes it, signs it and persists the immutable receipt.

### Verification

`POST /api/v1/verify` rate limits the caller, resolves the receipt, compares the
token digest in constant time, rebuilds the signed payload, verifies SHA-256 and
Ed25519, loads current transaction state and audits the result.

## Persistence

The Drizzle schema contains `transactions`, `receipts` and `audit_events`.
Receipt payload fields are duplicated intentionally: they are the signed
historical snapshot and must not be reconstructed from mutable transaction
fields.

## Deployment

The web application and API deploy together on Vercel. PostgreSQL and
environment-managed secrets are external managed resources. Build and runtime
are separate: no database connection or secret is required by `next build`.
