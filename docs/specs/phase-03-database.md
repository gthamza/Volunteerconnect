# Phase 03 database implementation

The migration `20261103170330_phase_03_volunteer_profile_security.sql` uses the Phase 02 tables. It does not recreate them or add task, matching, invitation, or notification tables. It adds `volunteer_profiles.local_area_knowledge boolean` and policies for volunteer-owned data. Existing `location geography(Point, 4326)` and its GiST index remain the PostGIS representation.

## Tables and relationships

- `app_users` maps the unique Clerk user subject to an internal UUID. Passwords and Clerk tokens are not stored.
- `volunteer_profiles.app_user_id` is a unique foreign key to `app_users.id`, so a user has at most one profile. The profile keeps its PostGIS location and local-area knowledge answer.
- `skills` is an empty catalogue; no unapproved skill names are inserted.
- `volunteer_skills` joins profiles to skills with a composite primary key, preventing duplicate selections.
- `disaster_types` is constrained to Flood and Earthquake. Existing Phase 02 seed behavior supplies those supported values.
- `volunteer_disaster_types` joins profiles to disaster types with a composite primary key.
- `organizations.clerk_organization_id` maps application organization references to Clerk Organizations. No second membership table or membership rule is introduced.

The Phase 02 migration already supplies foreign keys, uniqueness constraints, lookup/join indexes, and the spatial index. The Phase 03 migration does not duplicate them. Organization affiliation follows current Clerk Organization memberships dynamically; no second membership table or profile affiliation column is added. An organization member with a volunteer profile is treated as an affiliated volunteer for the read-only management screen.

## RLS behavior

RLS remains enabled on every application table by Phase 02. This migration adds policies only to the tables needed for profile self-service:

- `app_users`: a user may select the row whose `clerk_user_id` equals the verified JWT `sub`.
- `volunteer_profiles`: a user may select/insert/update only a profile linked to that same Clerk subject. Direct update is limited to `location` and `local_area_knowledge`; profile identity and timestamps cannot be changed through that grant.
- `skills` and `disaster_types`: authenticated users may read catalogue data.
- `volunteer_skills` and `volunteer_disaster_types`: select/insert/delete is limited to links on the caller's own profile.
- `organizations`: no client policy is added, so direct client access is denied. Organization volunteer profile reads remain denied to direct client access as well; the Express API checks the verified active Clerk organization and its live membership roster before using its server-only Supabase service-role client. Do not read organization volunteer profiles from a mobile Supabase client.

The policy uses `sub` and `role` only because the repository's claim verification record confirms those values for an independent signed-in session. Policies never trust user-editable metadata. There is no organization policy based on an unobserved active-organization claim. Express organization reads verify the active organization and its Clerk roster before the server-only database client reads matching profiles.

## Local execution

The Phase 02 migration is marked draft and renames legacy tables. Resolve and approve the Phase 02 baseline before applying either migration. In a local Supabase project with the approved Phase 02 baseline:

```sh
supabase start
supabase migration up --local
supabase test db
```

`supabase test db` runs both `supabase/tests/database/core_schema.test.sql` and `supabase/tests/database/phase_03_volunteer_rls.test.sql`. Do not run these migrations or tests against production/shared databases as part of this change. If the local database has already applied Phase 02, apply the new migration with `supabase migration up --local`.

## Decisions still needed

1. A direct organization-aware RLS policy remains unavailable because the current schema has no profile-to-organization relationship and the active organization JWT has not been verified. Express organization reads are gated against Clerk's current organization roster; direct Supabase reads remain denied. The database needs an approved authorization path before direct organization reads can be enabled.
2. The organization volunteer screen is read-only. It returns Clerk public names, skills, supported disasters, and local-area knowledge. Precise location and contact information remain private.
3. Approve any additional organization-visible profile fields. Name and contact data are excluded from Supabase storage; organization screens display only Clerk public names and coordination fields.
4. Approve the skill catalogue and its maintenance authority. The catalogue remains empty pending that decision.
5. Location precision, update frequency, and retention remain unresolved; this migration does not add location triggers or retention behavior.
