# Phase 02 API foundation

Base URL in local development: `http://localhost:3000`.

## Endpoints

| Method | Path | Authentication | Response |
|---|---|---|---|
| `GET` | `/health` | Public | `200` with `{ "status": "ok", "checks": { "database": "ok" } }` when a minimal Supabase query succeeds. Returns `503` with database `unconfigured` or `unavailable` otherwise. |
| `GET` | `/auth/me` | Clerk session | `200` with the verified Clerk `userId`; `401` when there is no valid signed-in session; `503` when Clerk is not configured. |

Send a Clerk session token using `Authorization: Bearer <session-token>`. Do not send user IDs or organization IDs as authorization evidence; future handlers must derive identity from the verified Clerk session and perform explicit membership, registration, and ownership checks.

## Request and error handling

- JSON request body limit: 100 KiB.
- URL-encoded body limit: 100 KiB and at most 100 parameters.
- Each request receives an `X-Request-Id`. Error responses include the same ID when available.
- Unknown paths return `404` with code `NOT_FOUND`.
- Common parse/size/auth errors return safe messages. Unexpected errors return a generic `500` response; internal exception text, tokens, headers, query strings, and request bodies are not logged.
- CORS allows requests without an `Origin` header for native clients. Browser origins are restricted to `CORS_ORIGINS` in production.

No business data endpoints exist in Phase 02. The health check is a readiness check: database failure produces HTTP 503 even while the Express process remains running.
