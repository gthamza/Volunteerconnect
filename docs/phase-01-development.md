# Phase 1 development setup

## Environment

Copy `.env.example` to `.env.local` and set:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` from the Clerk Expo application.
- `EXPO_PUBLIC_SUPABASE_URL` from the Supabase project API settings.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` from the project's client-safe anon key. Never put a Supabase service-role or secret key in Expo environment variables.

The Supabase client is created on first use, so configuring Clerk sign-in does not depend on Supabase being available. Its `accessToken` callback returns the active Clerk session token. Supabase requires Clerk to be registered as a third-party auth provider and the Clerk token to include a `role` claim for authenticated database access. Complete that setup in both dashboards before using Supabase data; Phase 1 intentionally creates no application tables or RLS policies.

## Run and check

```sh
npx expo start
npx expo run:android
npx tsc --noEmit
```

For the Android run, connect a USB-debugging-enabled device or start an Android Studio emulator first. The current app uses Clerk hosted sign-in, so enabled sign-in methods and redirect URLs must be configured in Clerk.

## Organization access

Organization members use the same Clerk account as independent volunteers. The landing screen's **Organization sign in** entry authenticates with Clerk and opens the organization access route. That route lists the user's existing organization memberships, lets the user select an active workspace, and accepts pending organization invitations. The home screen also links to organization access for signed-in users.

Organization representatives can create a Clerk workspace in the app; Clerk makes the creator its administrator, who can invite colleagues from the workspace. The app labels workspaces as unverified because creating a Clerk workspace does not confirm official registration. An official verification workflow is not included. Keep Clerk Organizations in optional membership mode so independent volunteers are not forced to join an organization.

## Boundaries

- Clerk owns authentication and organization membership. Supabase Auth is not enabled.
- Organization workspaces can be created in the app, but official organization verification is not implemented.
- Do not create application tables in this phase. Verify the actual Clerk JWT claims before designing RLS policies in a later phase.
