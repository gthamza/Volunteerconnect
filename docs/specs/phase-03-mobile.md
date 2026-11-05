# Phase 03 mobile volunteer profile screens

The protected Expo Router paths `/profile`, `/edit-profile`, and `/skills` show and edit a volunteer's own Phase 03 profile. `/skills` provides a focused selection screen for the backend skills catalogue and supported disaster types; `/edit-profile` also permits those preferences to be edited with local-area knowledge. The screens use the existing Clerk session token to call the Express API at `EXPO_PUBLIC_API_URL` plus `/api/v1` and use TanStack Query for profile and catalogue state.

The profile API permits edits to the volunteer's own location, local-area knowledge, skill associations, and supported disaster-type associations. The location screen can use a one-time foreground GPS reading, select a point on the OpenStreetMap-compatible map, or accept manually entered coordinates. Permission is requested only after the volunteer chooses GPS and confirms the explanation. Denial leaves map and manual selection available. No background or continuous tracking is used. The API returns precise coordinates only to the authenticated volunteer; organization routes remain closed. The approved skill catalogue can be empty; the app does not seed example skills. Name and email are displayed from the signed-in Clerk user. Phone, volunteer category, and volunteer-to-organization affiliation are not exposed by the current profile API and are identified as unavailable in the UI. No client-side organization relationship is inferred.

If a profile does not exist, `/profile` offers creation through `POST /volunteers/me`. The edit screen validates the yes/no local-area answer and catalogue IDs with React Hook Form and Zod, then applies differences using the existing API routes. Since the API exposes separate requests rather than a transaction, an interrupted save may have applied some updates; the UI reports the error and directs the volunteer to review the profile before retrying.

## Run the screens

1. Configure the usual Expo Clerk publishable key and the backend's Clerk/Supabase settings.
2. Set `EXPO_PUBLIC_API_URL` to the Express server's reachable base URL (for example, the LAN address of the development machine for a physical device; do not use `localhost` from a device).
3. Start the backend with `cd backend && npm run dev`.
4. Start Expo with `npm run start`, sign in, then open Profile from the home screen. Create a profile if the API reports that one does not exist.

Open Skills & disasters from the volunteer profile to manage the skill and disaster-type selections. The backend controls the skill catalogue. Disaster types are retrieved from the API, which currently exposes Flood and Earthquake.

When a Clerk Organization is active, Home also links to Organization Profile and Organization Volunteers. The profile shows the active workspace name and Clerk role. Volunteer management lists members of that active Clerk organization who have volunteer profiles; selecting one opens a read-only detail view. The API only returns the member's public name, skills, supported disaster types, and local-area knowledge. Location and contact information remain private. A volunteer with no active organization is redirected to organization access. Backend 403/404 responses are shown as unauthorized or unavailable states.

Run the screen and form-validation tests with:

```sh
npm test -- --runTestsByPath src/features/volunteers/profile-screen.test.tsx src/features/volunteers/edit-profile-screen.test.tsx src/features/volunteers/skills-screen.test.tsx src/features/volunteers/validation.test.ts
npm run typecheck
```

The API details and currently unavailable profile fields are documented in [the Phase 03 API contract](./phase-03-api.md).
