# Threat model

Scope: the Next.js web/API system, PostgreSQL, signing material, QR verification
URLs and issuer demo. STRIDE categories are shown in parentheses.

| Threat | Attack scenario | Impact | Mitigation | Residual risk |
| --- | --- | --- | --- | --- |
| Modified visual receipt (T) | Attacker edits amount/destination in an image | Recipient trusts false data | API returns issuer-signed fields; Security Lab demonstrates mismatch | User may ignore verifier |
| Copied QR (S/T) | Valid QR is pasted on another document | Authentic QR lends false visual credibility | Verifier displays authoritative issuer data, never trusts surrounding document | Social engineering remains |
| Invented receipt ID (S) | Random UUID is submitted | Enumeration or false existence claims | Random UUIDs, generic `NOT_FOUND`, rate limiting | UUID/token leakage can enable targeted probes |
| Enumeration (I) | Automated requests test identifiers | Receipt existence disclosure | 128-bit IDs, bearer token, uniform minimized failures, rate limits | Process-local PoC limiter is weak across instances |
| Leaked verification token (I) | URL is copied, logged or shared | Anyone with URL can verify minimized data | `no-referrer`, no token logs, token HMAC at rest, robots disabled | Browser history and recipient sharing |
| Private key compromise (S/E) | Environment or host secret is stolen | Forged issuer receipts | Server-only boundary, ignored files, rotation-ready keyId; production KMS/HSM | Environment provider uses exportable PoC key |
| Replay (R) | Same verification URL is used repeatedly | Traffic abuse or correlation | Idempotent read, rate limits, audit events | Token intentionally remains valid for receipt lifetime |
| API brute force (D) | High-rate token/UUID attempts | Availability loss | Body limits, Zod, `RateLimitService`, WAF recommended | In-memory limits reset and are per instance |
| Database tampering (T) | Protected receipt amount/hash is changed | False stored data or denial of verification | Ed25519 verification over reconstructed payload; security test mutates data | Attacker with DB and signing key can forge |
| Backend compromise (E) | Runtime code or credentials are controlled | Full issuance/verification compromise | Least privilege, managed secrets, SIEM, patching, KMS roadmap | Application host remains high-trust |
| XSS (T/I) | Malicious reference or UI input executes script | Token/session or UI compromise | React escaping, strict Zod lengths, CSP, no raw HTML | Current CSP permits framework inline scripts |
| CSRF (S/T) | Foreign site invokes issuer/demo routes | Unauthorized demo mutation | JSON requests, same-origin checks, `DEMO_MODE`, optional internal key | PoC has no user identity/RBAC |
| Secret in client bundle (I) | Server env is accidentally imported by React | Private key/DB disclosure | `server-only`, no `NEXT_PUBLIC_` secrets, build without secrets, bundle review | Developer can intentionally bypass architecture |
| Issuer Simulator abuse (T/D) | Public demo is reset or flooded | Demo disruption and cost | Disabled by default, same-origin/internal access, audit, production RBAC plan | Public PoC with demo enabled remains mutable |
| Compromised dependency (T/E) | npm package or build tool is malicious | Build/runtime compromise | Lockfile, minimal runtime dependencies, SCA, review and provenance plan | Transitive supply-chain exposure remains |

## Trust boundaries

1. Browser to public/issuer HTTP API.
2. Route Handler to application services.
3. Application services to PostgreSQL and signing provider.
4. Deployment environment to managed secret and database providers.

Private key material and `DATABASE_URL` must never cross boundary 2 toward the
browser. Public verification data is minimized to amount, currency, masked
destination, issuance time and status.
