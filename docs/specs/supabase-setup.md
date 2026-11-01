# Supabase setup and database workflow

**Phase:** 02 — Database Design & Backend Foundation
**Status:** Connected project exists; canonical Phase 02 schema is not approved or applied.

## Current state

The backend connects to the configured Supabase project using `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. The public `GET /health` endpoint makes a read-only query and the user confirmed it returned `{"status":"ok","checks":{"database":"ok"}}`.

The connected project already contains legacy public tables and has no recorded migrations. The local file `supabase/migrations/20261031134522_phase_02_core_schema.sql` is explicitly marked draft. It renames existing tables, creates a proposed replacement schema, and assumes the legacy tables exist. It is neither a clean-database bootstrap nor an approved remote migration.

## Safe workflow after schema approval

1. Approve a baseline and migration strategy that preserves the existing project data and resolves the collision between legacy and proposed table names.
2. Review the physical schema against the [ERD](./database-erd.md), [data dictionary](./database-data-dictionary.md), and [design review](./database-design-review.md). The current ERD and dictionary are logical drafts and are not fully aligned with the migration.
3. Prepare a disposable local Supabase environment with the approved baseline and migrations. Do not use the shared/remote project as a test database.
4. Enable PostGIS and apply the reviewed migrations locally.
5. Run `supabase test db` from the repository root. The pgTAP suite is in `supabase/tests/database/core_schema.test.sql`.
6. Inspect migration status and the resulting schema. Verify that all application tables have RLS enabled and that the geospatial columns and indexes exist.
7. Before production migration, review data preservation, grants, RLS policies, rollback/forward recovery, and the exact deployment plan.

## Security boundary

- Supabase Auth is not enabled as an identity provider; Clerk is the identity provider.
- The service-role key remains on the backend only and bypasses RLS. Backend routes must perform verified identity, membership, organization-registration, and task-ownership checks before privileged database operations.
- RLS policies are intentionally not specified in this setup guide. Verify actual Clerk token claims and approve the access model first; see [Clerk claim verification](./clerk-jwt-claim-verification.md) and the [RLS matrix](./database-rls-permission-matrix.md).
- Do not apply the draft migration to the connected project or a clean database. Do not rename, drop, or archive legacy tables without an approved migration plan.

## Local tooling

The Supabase CLI is used for local development and pgTAP. `supabase test db` was attempted during this review but could not connect because no local PostgreSQL service was running on the CLI's local port. The SQL test suite therefore remains authored but not executed.
