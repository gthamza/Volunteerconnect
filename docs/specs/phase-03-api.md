# Phase 03 volunteer API

Base path: `/api/v1`

All routes require a valid Clerk session in `Authorization: Bearer <session-token>`. Responses use `{ "data": ... }` on success and `{ "error": { "code", "message" } }` for errors. Request IDs are included when available.

The backend uses its server-only Supabase service-role client after deriving the Clerk user ID from verified request auth. The mobile app must never receive `SUPABASE_SERVICE_ROLE_KEY`.

## Routes

| Method | Path | Purpose | Success |
|---|---|---|---|
| `POST` | `/volunteers/me` | Create the authenticated user's profile; body must be `{}` | `201` |
| `GET` | `/volunteers/me` | Read own profile and selected skills/disaster types | `200` |
| `PATCH` | `/volunteers/me` | Update `localAreaKnowledge` and/or the volunteer's profile location | `200` |
| `GET` | `/volunteer-skills` | Read the approved skills catalogue | `200` |
| `POST` | `/volunteers/me/skills` | Add catalogue skill IDs; body `{ "skillIds": ["<uuid>"] }` | `200` |
| `DELETE` | `/volunteers/me/skills/:id` | Remove one skill from own profile | `200` |
| `GET` | `/disaster-types` | Read supported disaster types (Flood and Earthquake only) | `200` |
| `POST` | `/volunteers/me/disaster-types` | Add supported IDs; body `{ "disasterTypeIds": ["<uuid>"] }` | `200` |
| `DELETE` | `/volunteers/me/disaster-types/:id` | Remove one disaster type from own profile | `200` |
| `GET` | `/organizations/me/volunteers` | List profiles belonging to members of the active Clerk organization | `200`; `403` without active organization membership |
| `GET` | `/organizations/me/volunteers/:id` | Read a permitted profile belonging to a member of the active Clerk organization | `200`; `404` if absent or outside the organization |

The Phase 03 profile schema contains PostGIS `location` and Boolean `local_area_knowledge`. A profile owner may update the location with `{ "location": { "latitude": 33.6844, "longitude": 73.0479 } }`, or clear it with `null`. Coordinates are validated and stored as SRID 4326 geography; the API returns them only in the authenticated volunteer's own profile response. Organization endpoints remain closed, so this API does not expose location to organizations. The mobile app requests foreground location only after the volunteer taps the GPS action and confirms the explanation; a map/manual option remains available. It does not collect background or continuous location. The API does not accept name, phone, or email because those fields are absent from the approved schema and privacy rules are unresolved. Profile responses therefore contain no contact information.

The skills catalogue currently has no approved entries. `GET /volunteer-skills` returns the records present in the catalogue (currently expected to be empty); the API does not seed example skills. Disaster types are filtered to Flood and Earthquake even if other rows exist in a noncanonical database.

Organization affiliation follows the active Clerk Organization membership roster: an organization member with an existing VolunteerConnect volunteer profile is listed as an affiliated volunteer. Express derives the active organization ID and role from Clerk's verified request auth, then obtains that organization's current membership roster from Clerk's backend API. Client-supplied organization IDs are not accepted. The active organization's members may read volunteer names from Clerk public membership data, selected skills, supported disaster types, and the local-area knowledge answer. Precise location, email, phone, and other personal information are not returned. A role outside the Clerk organization role namespace is rejected. Profile detail returns the same 404 for a missing profile and a profile outside the active roster.

The database has no profile-to-organization relationship, and Clerk's membership roster is authoritative. Therefore Postgres RLS continues to deny direct client reads of other users' profiles; the backend's server-only service-role access is gated by the verified Clerk organization roster check before every organization read. Do not add an application-owned membership mirror. RLS tests confirm that an active organization claim alone does not grant direct profile access. An organization-aware RLS policy allowing server-initiated profile reads cannot safely be expressed without a verified database relationship/claim path, so organization reads must stay behind Express until that database authorization path is approved and verified.

## Request and response examples

Create a profile:

```http
POST /api/v1/volunteers/me
Authorization: Bearer <Clerk session token>
Content-Type: application/json

{}
```

```json
{
  "data": {
    "id": "a2000000-0000-4000-8000-000000000001",
    "localAreaKnowledge": null,
    "createdAt": "2026-11-03T09:00:00Z",
    "updatedAt": "2026-11-03T09:00:00Z",
    "skills": [],
    "disasterTypes": []
  }
}
```

Update permitted profile information:

```http
PATCH /api/v1/volunteers/me
Authorization: Bearer <Clerk session token>
Content-Type: application/json

{"localAreaKnowledge": true}
```

```json
{
  "data": {
    "id": "a2000000-0000-4000-8000-000000000001",
    "localAreaKnowledge": true,
    "createdAt": "2026-11-03T09:00:00Z",
    "updatedAt": "2026-11-03T09:01:00Z",
    "skills": [],
    "disasterTypes": []
  }
}
```

Add skills (IDs must already exist in the catalogue):

```http
POST /api/v1/volunteers/me/skills
Authorization: Bearer <Clerk session token>
Content-Type: application/json

{"skillIds": ["b2000000-0000-4000-8000-000000000001"]}
```

Invalid input returns `400 VALIDATION_ERROR`; an unavailable catalogue ID returns `400 INVALID_SKILL` or `400 INVALID_DISASTER_TYPE`; a second profile returns `409 PROFILE_ALREADY_EXISTS`; reading or modifying a profile before creation returns `404 PROFILE_NOT_FOUND`.

## Authorization and tests

The API does not accept user, profile, or organization IDs for self-service writes. It resolves the internal profile through `app_users.clerk_user_id`, which comes from Clerk's verified `userId`. All request bodies and resource IDs are Zod-validated. The test suite runs route requests through an Express HTTP server with an in-memory Supabase-compatible test double; the production router defaults to the Clerk `requireAuthenticatedUser` middleware.

Run `cd backend && npm test` and `cd backend && npm run typecheck`.
