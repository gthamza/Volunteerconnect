# Backend setup guide

## Requirements

- Node.js compatible with the backend runtime (the current development environment uses Node 22).
- npm.
- Clerk instance credentials for authenticated routes.
- Supabase project URL and server-only service-role key for database readiness and server-side access.

## Run locally

1. Change to `backend/`.
2. Copy `.env.example` to `.env` and set the values described in [environment variables](./environment-variables.md). Keep `.env` private and out of version control.
3. Install backend dependencies with `npm install`.
4. Start the server with `npm run dev`.
5. Request `GET http://localhost:3000/health`. A configured and reachable database returns HTTP 200. An unconfigured/unavailable database returns HTTP 503.
6. Send a Clerk session token as `Authorization: Bearer <session-token>` to `GET http://localhost:3000/auth/me`. It returns the verified user ID, or an authentication error.

## Build and verify

- `npm run typecheck` type-checks backend source and tests.
- `npm test` runs backend unit tests.
- `npm run build` compiles the backend to `backend/dist/`.
- `npm start` runs the compiled server.

`/health` is public and runs before Clerk middleware so health status remains available during Clerk outages. No profile, task, matching, invitation, or notification APIs are part of this Phase 02 foundation.

See [backend README](../../backend/README.md) for current implementation details and security boundaries.
