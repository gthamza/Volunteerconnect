# Phase 02 unresolved decisions and approval gates

These items remain unresolved. They must not be guessed during implementation.

## Database baseline and security

1. Choose whether the existing legacy Supabase schema will be migrated in place, isolated, or retired. Preserve existing data and resolve naming collisions before approving a canonical schema migration.
2. Review the draft migration against an approved baseline; decide how a clean local database is bootstrapped and how existing lookup data is preserved.
3. Confirm whether trusted backend database access will remain service-role based or use a user-scoped Clerk JWT. If service role remains, define and test the complete backend authorization checks.
4. Verify active-organization Clerk claims from a real session and confirm the mobile Clerk token is accepted by Supabase. Independent-user claim shape alone is insufficient to write tenant policies.
5. Approve Data API grants and the table-by-table RLS policy predicates. Policies are not currently implemented.

## Product/schema decisions

6. Organization registration and verification workflow and which verified organization members may create/manage tasks.
7. Independent and organization-affiliated volunteer onboarding, account management, and organization affiliation cardinality.
8. Disaster skill catalogue, catalogue maintenance authority, and multiple-skill matching semantics.
9. Volunteer and task location source, manual/GPS workflow, update process, privacy, and retention.
10. Matching distance threshold, score, weighting, ranking, and tie-breaking.
11. Invitation and request response state vocabularies, expiry, final no-response cutoff, and simultaneous invitation behavior.
12. Cross-organization request membership eligibility and duplicate-request behavior.
13. SMS/email providers, notification status and retry model, reminder delivery, and deduplication keys.
14. CNIC handling, personal-data retention, account deletion, and audit-event retention.
15. Production hosting, rollout, rollback, and provider cost plan.

The 20-minute reminder requirement is fixed by the project instructions; the final No Response cutoff remains undecided.

See the [database design review](./database-design-review.md), [RLS matrix](./database-rls-permission-matrix.md), and [Clerk claim verification log](./clerk-jwt-claim-verification.md) for context.
