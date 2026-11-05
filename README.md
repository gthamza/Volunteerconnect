# VolunteerConnect

VolunteerConnect is a disaster-relief coordination app for Pakistan. It is being built for independent volunteers, organization-affiliated volunteers, and registered relief organizations responding to floods and earthquakes.

The project uses React Native and Expo for mobile, Clerk for authentication and organization workspaces, Supabase PostgreSQL for application data, and an Express + TypeScript backend. The Python matching service and disaster coordination workflows are planned for later phases.

## Project status

- **Phase 01 — Authentication, Organizations, and App Shell:** foundations are implemented in the app: Clerk sign-in and organization access, protected routes, theme preferences, and the Supabase client/token bridge.
- **Phase 02 — Database and Backend Foundation:** backend/API foundations and design artifacts exist, but the phase is **not complete**. The connected database has legacy tables, the proposed migration is a draft, RLS policies are not implemented, and the database test suite has not been run. See the [Phase 02 acceptance review](docs/specs/phase-02-acceptance-review.md) before applying migrations or starting Phase 03.
- **Phase 03 — User Profiles and Volunteer Management:** specified, but gated on completing Phase 02 and resolving its open decisions.

Task management, matching, invitations, SMS/email notifications, and automatic assignment are not implemented. Matching is intended to produce a recommendation only; volunteer consent and task-owner authorization remain core project rules.

## Getting started

### Mobile app

Requirements: Node.js, npm, and an Android device/emulator with the Android SDK for a native development build.

1. Install dependencies: `npm install`.
2. Copy `.env.example` to `.env.local` and set the Clerk publishable key and Supabase project URL and anon key.
3. Start Expo: `npm start` (or `npx expo start`).
4. For an Android development build, run `npm run android` with a device or emulator available.

Configure the Clerk sign-in methods and redirect URLs for this app. See [Phase 01 development setup](docs/phase-01-development.md) for dashboard setup and the Clerk-to-Supabase token notes.

### Backend

The Express API foundation runs separately from Expo:

1. Change to `backend/` and copy `.env.example` to `.env`.
2. Set backend Clerk and Supabase values as described in [environment variables](docs/specs/environment-variables.md).
3. Run `npm install`, then `npm run dev`.
4. Check `GET http://localhost:3000/health`. A configured database returns HTTP 200; otherwise the endpoint reports the dependency state with HTTP 503.

The backend currently exposes the health endpoint and authenticated `GET /auth/me` only. It has no profile, task, matching, invitation, or notification data APIs yet. See the [backend setup guide](docs/specs/backend-setup.md) and [API foundation](docs/specs/api-foundation.md).

## Architecture

| Area | Current implementation |
|---|---|
| Mobile app | Expo, React Native, TypeScript, Expo Router (`src/app`) |
| Authentication and organizations | Clerk Expo and Clerk Organizations |
| Styling | NativeWind v5 RC with Tailwind CSS v4 (`src/global.css`) |
| Supabase mobile client | Lazy client with Clerk session token bridge (`src/services/supabase`) |
| Backend | Express 5 + TypeScript (`backend/src`), Clerk token middleware, server-side Supabase client |
| Database work | Supabase migrations and pgTAP suite (`supabase/`); current Phase 02 migration is draft only |

The mobile app and backend use separate environment files. Never put Clerk secret keys or the Supabase service-role key in Expo variables or the mobile app. The backend service-role client bypasses RLS, so privileged database operations require backend-side identity and authorization checks. No Supabase Auth account system is used.

## Useful commands

From the repository root:

```sh
npm start             # Start Expo
npm run android       # Build/run the Android development app
npm run typecheck     # Type-check the mobile app
npm test              # Run the mobile Jest suite
```

From `backend/`:

```sh
npm run dev           # Start the backend in watch mode
npm run typecheck     # Type-check backend source and tests
npm test              # Run backend unit tests
npm run build         # Compile the backend
```

Database tests use `supabase test db` from the repository root and require a running local Supabase database with an approved schema installed. Do not run them against the shared project. The current draft migration is not approved for application.

## Documentation

Start at the [documentation index](docs/README.md). It links to the phase specifications, setup guides, database design and security reviews, acceptance report, testing notes, and unresolved decisions.

Key references:

- [Phase 01 specification](docs/specs/phase-01.md) and [development setup](docs/phase-01-development.md)
- [Phase 02 specification](docs/specs/phase-02.md) and [acceptance review](docs/specs/phase-02-acceptance-review.md)
- [Phase 02 open decisions](docs/specs/phase-02-open-decisions.md)
- [Supabase migration and setup guidance](docs/specs/supabase-setup.md)
- [Phase 03 specification](docs/specs/phase-03.md)
