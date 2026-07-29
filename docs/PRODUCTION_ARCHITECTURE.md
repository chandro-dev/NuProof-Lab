# Production architecture

The PoC uses a Next.js modular monolith, managed PostgreSQL and an
environment-backed signing provider. A financial system should evolve to:

```text
Web -> WAF/API Gateway -> Receipt/Verification API -> PostgreSQL
                               |
                               v
                         Signing service
                               |
                               v
                            KMS/HSM
```

Required production controls include:

- OIDC/OAuth2, RBAC, workload IAM and least privilege;
- KMS/HSM non-exportable keys, rotation ceremonies and emergency revocation;
- mTLS between services and verified TLS to PostgreSQL;
- distributed rate limiting, WAF rules and abuse monitoring;
- structured logs to a SIEM and append-only/immutable audit storage;
- secret manager injection without build-time access;
- tracing, metrics, SLOs and fraud signals;
- multi-zone availability, tested backups and point-in-time recovery;
- disaster recovery exercises and documented incident response;
- dependency provenance, lockfile review, SCA and patch policy.

Vercel security headers are configured in `next.config.ts`. HSTS is effective on
HTTPS deployments. CSP allows the inline scripts/styles required by the current
Next runtime, restricts external origins, and permits same-origin camera worker
blobs for QR scanning.

The in-memory rate limiter is process-local and is not a production control.
Replace the `RateLimitService` implementation with Redis or gateway/WAF limits.
