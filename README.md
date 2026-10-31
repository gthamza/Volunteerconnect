# VolunteerConnect

VolunteerConnect is a React Native app for coordinating volunteer relief work in Pakistan. Phase 1 provides Clerk sign-in, organization workspaces, protected app navigation, appearance settings, and the Supabase client foundation.

## Run locally

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and add the Clerk publishable key and Supabase project URL and anon key.
3. Start Metro with `npx expo start`, or build a native Android development app with `npx expo run:android`.

The Android build requires an Android SDK and a connected device or configured emulator. See [Phase 1 setup notes](docs/phase-01-development.md) for the Clerk and Supabase dashboard setup.

## Project layout

- `src/app` contains Expo Router routes. `(protected)` gates signed-in screens before mounting them.
- `src/features` contains organization and theme UI.
- `src/services/supabase` contains the reusable Supabase client and Clerk session token bridge.
- `src/global.css` defines NativeWind v5/Tailwind v4 theme tokens.

No application database tables are created in Phase 1.
