# Phase 02 Database Test Notes

Database-level checks are in `supabase/tests/database/core_schema.test.sql` and use pgTAP. Run them against a local Supabase database with:

```sh
supabase test db
```

The suite checks the expected application tables, primary keys, RLS enablement, foreign-key presence, Flood/Earthquake constraints, task lifecycle constraints, PostGIS, spatial indexes, and the single matching report constraint. Constraint behavior is checked with invalid values and a duplicate-report fixture. Fixtures run inside a transaction and are rolled back.

## Prerequisites and boundaries

- Do not run this suite against production or another shared database.
- A local Supabase database must be available, and the Phase 02 schema must be installed first.
- The existing migration is explicitly marked draft and renames legacy tables, so it assumes a legacy schema baseline and cannot be treated as a clean-database bootstrap migration yet.
- The migration enables RLS but intentionally defines no policies. Tests verify RLS is enabled; they do not infer ownership rules from unverified Clerk JWT claims. Add authorization-policy tests after the claim contract and policies are approved.

## Execution status

The suite has been authored but not executed. `supabase test db` was attempted on 2026-10-31; it could not connect because no local Postgres service was running. It was not run against the connected/shared project. See the [Phase 02 acceptance review](./phase-02-acceptance-review.md) for the full status.
