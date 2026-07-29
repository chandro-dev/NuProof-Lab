# Microservice extraction

The current deployment is intentionally one Next.js system:

```text
Next.js UI + /api/v1 -> application -> domain -> infrastructure -> PostgreSQL
```

No domain rule depends on Next.js. A future extraction can move these directories
unchanged into `services/nuproof-api`:

- `src/domain`;
- `src/application`;
- `src/infrastructure/crypto`;
- `src/infrastructure/database`;
- `src/infrastructure/observability`;
- `src/infrastructure/security`;
- `src/types`.

The existing `app/api/v1` adapters can be replaced by Express, Fastify or another
HTTP transport that calls the same application services. The web
`src/lib/api/client.ts` changes its base URL to `https://api.nuproof.example`.

## Extraction sequence

1. Publish API contracts and domain types as a versioned package.
2. Deploy API and PostgreSQL privately while Next proxies `/api/v1`.
3. Move signing to a separate KMS/HSM-backed provider.
4. Change the browser API base URL with CORS and OAuth policies.
5. Remove the proxy after traffic and observability prove parity.

Database ownership moves with the API. No browser component receives repository
or signing access during the transition.
