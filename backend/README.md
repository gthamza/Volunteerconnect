# VolunteerConnect backend

Express + TypeScript API foundation for Phase 02.

## Local setup

1. From this directory, copy `.env.example` to `.env`. Set the Supabase URL and server-only service-role key to enable database connectivity and a healthy readiness response. The server can start without them in development, but `/health` will return `503` until Supabase is configured.
2. Set `CLERK_SECRET_KEY` in `.env` to the secret key for the same Clerk instance used by the Expo app.
3. Run `npm install`.
4. Run `npm run dev`.
5. Check `GET http://localhost:3000/health`. It returns `{ "status": "ok", "checks": { "database": "ok" } }` when the backend can query Supabase, or `503` with an unavailable database status otherwise.

Use `npm run build` to compile and `npm start` to run the compiled server.
The service validates its environment before listening. In local development,
it can start without credentials so the API process can be developed offline.
Production startup requires Clerk and Supabase configuration.
The Expo app must use a separate environment file and must never receive
`SUPABASE_SERVICE_ROLE_KEY`.

## Security boundary

Clerk middleware verifies incoming session tokens from the `Authorization: Bearer <session-token>` header.
`GET /auth/me` is a protected verification endpoint: it returns the verified Clerk user ID, returns `401` without a valid signed-in session, and returns `503` when Clerk is not configured. Feature routes should use `requireAuthenticatedUser` and then apply their feature-specific authorization checks. Keep `/health` public for service health checks.
The server Supabase client uses a service-role credential, which bypasses RLS;
use it only after the backend has enforced the relevant identity, membership,
organization registration, and ownership checks. No data operations are exposed
in this foundation phase.

`CORS_ORIGINS` accepts a comma-separated allowlist of exact web origins. Native
clients that do not send an `Origin` header are allowed. An empty allowlist
allows browser origins only outside production; production browser origins must
be explicitly configured.

## Tests

- Run backend middleware and API foundation unit tests with `npm test`.
- Run `npm run typecheck` to type-check both backend source and its tests.
- Run database pgTAP tests with `supabase test db` from the repository root after a local Supabase database has been started and the Phase 02 schema is installed.

The database suite checks the current schema contract: table and key presence, check constraints, spatial indexes, the one-report-per-task constraint, and RLS enablement. It does not assert user or organization ownership policies because the Clerk JWT claim contract is still pending verification. The existing Phase 02 migration is marked draft and assumes legacy tables exist, so it must not be applied to a clean or remote database until its baseline and migration workflow are reviewed.
