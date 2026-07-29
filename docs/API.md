# API v1

All JSON inputs are strictly validated. Error responses use:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "The request is invalid." } }
```

Every response includes `x-request-id`.

## Public

- `GET /api/v1/health`
- `POST /api/v1/verify`
- `GET /api/v1/security/public-keys`

Verification failures are stable result bodies (`NOT_FOUND`,
`INVALID_VERIFICATION_TOKEN`, `INVALID_SIGNATURE`) with HTTP 200 so clients can
render an expected business outcome. Validation, rate limiting and server errors
use HTTP 4xx/5xx.

## Issuer / demo

- `GET|POST /api/v1/transactions`
- `GET /api/v1/transactions/:id`
- `POST /api/v1/transactions/:id/receipts`
- `PATCH /api/v1/transactions/:id/status`
- `GET /api/v1/receipts/:id`
- `GET /api/v1/audit`
- `POST /api/v1/demo/reset`
- `POST /api/v1/security-lab/tamper`

These routes require `DEMO_MODE=true` and either a same-origin browser request or
the `x-internal-api-key` credential. A real issuer must replace this PoC policy
with OIDC/OAuth2, RBAC and network controls.

The machine-readable contract is [openapi.yaml](openapi.yaml).
