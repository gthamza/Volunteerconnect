# Environment variables

Keep mobile and backend environments separate. Never put the Supabase service-role key in the Expo app, an `EXPO_PUBLIC_` variable, logs, or API responses. Do not commit `.env` or `.env.local` files.

## Backend (`backend/.env`)

| Variable | Required | Purpose |
|---|---:|---|
| `NODE_ENV` | No; defaults to `development` | Runtime mode: `development`, `test`, or `production`. |
| `PORT` | No; defaults to `3000` | HTTP listening port, 1–65535. |
| `CLERK_SECRET_KEY` | Required in production | Server credential used by `@clerk/express` to verify Clerk sessions. Use a key from the same Clerk instance as the mobile app. |
| `SUPABASE_URL` | Required in production | Supabase project URL. |
| `SUPABASE_SERVICE_ROLE_KEY` | Required in production | Server-only privileged database API key. It bypasses RLS and must only be used after backend authorization. |
| `CORS_ORIGINS` | No; defaults to empty | Comma-separated exact browser origins. Native clients without an `Origin` header are accepted. In production, browser origins must be listed. |

The development template is `backend/.env.example`. It contains placeholders only. For offline development, Clerk and Supabase may be omitted outside production; protected auth endpoints then fail closed and `/health` reports the database as unconfigured.

## Mobile app

The mobile app uses its own Expo environment configuration. It must not receive `CLERK_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY`. The client may use Clerk's supported session handling and the approved Supabase public credential path; no Supabase Auth account is created.

## Rotation

If a credential was copied into a tracked example, shared log, or chat, rotate it at its provider and update the private environment file. Do not paste the replacement into documentation.
