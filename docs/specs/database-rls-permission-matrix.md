# VolunteerConnect RLS permission matrix — design draft

**Status:** Policy intent only; not executable or approved for migration  
**Companion documents:** [ERD](./database-erd.md), [data dictionary](./database-data-dictionary.md), [design review](./database-design-review.md)  
**Identity:** Clerk; no Supabase Auth

Claim inspection progress is tracked in [Clerk JWT claim verification](./clerk-jwt-claim-verification.md). Do not turn this matrix into SQL policy predicates until actual session claims and the canonical table schema are verified.

This matrix defines the intended row access boundaries for the 16 proposed application tables. It does not define SQL policies. Phase 02 requires inspection of actual Clerk JWT claims and verification of the backend/database authorization path before policies are written. Do not substitute guessed claim names, `auth.uid()` assumptions, client-supplied IDs, or a service-role connection for that review.

## Actor definitions

- **User:** An authenticated Clerk user whose verified identity maps to one `app_users` row.
- **Volunteer:** A user who owns the referenced `volunteer_profiles` row.
- **Task owner:** A verified and authorized member acting for the organization that owns the task. Organization membership alone does not prove official registration or task-management authority.
- **Receiving organization:** An authorized member of the organization named as the recipient of an organization request.
- **Reference-data maintainer:** A backend-controlled role/process approved to maintain disaster types and skills. The maintainer model is TBD.
- **Trusted backend:** Express API after Clerk token, membership, registration authorization, request validation, and task ownership checks. Its database credential and role must be designed so privilege bypass is understood and contained.
- **Other client:** Any user/organization outside the row's permitted ownership or participation boundary.

## Operation matrix

Legend: **Own** = only the stated owner/participant; **Task** = task-owning organization; **Receive** = receiving organization; **Backend** = trusted backend only; **Read** = approved reference-data read; **—** = no direct client operation; **TBD** = product authorization decision still needed.

| Table | SELECT | INSERT | UPDATE | DELETE | Boundary / notes |
|---|---|---|---|---|---|
| `app_users` | Own | Backend (identity sourced from verified Clerk subject) | Own permitted non-identity fields, if any; otherwise Backend | Backend only, subject to retention/deletion policy | Never allow a client to claim another Clerk ID. Email/phone fields are not currently approved. |
| `organizations` | Verified members of that organization | Backend after validating Clerk Organization | Backend after validating source-of-truth organization data | Deny direct client deletion; retention/verification lifecycle TBD | Clerk membership is not official registration verification. |
| `volunteer_profiles` | Volunteer Own; managing organization access only to approved necessary fields | Own or Backend after onboarding approval | Own permitted profile fields; organization-managed fields only under approved affiliation/field rules | Backend only after account/deletion policy approval | Do not expose contact details or precise location to unrelated organizations. Affiliation model unresolved. |
| `disaster_types` | Read | Reference-data maintainer/Backend | Reference-data maintainer/Backend | Reference-data maintainer/Backend; seeded rows should normally be retained | Only Flood and Earthquake. Reference write role must be selected. |
| `skills` | Read | Reference-data maintainer/Backend | Reference-data maintainer/Backend | Reference-data maintainer/Backend; prevent breaking historical references | Catalogue and manager are unresolved. |
| `volunteer_disaster_types` | Volunteer Own; authorized managing organization only if approved | Volunteer Own or Backend, depending on onboarding model | No mutable payload beyond deleting/reinserting own link, if approved | Volunteer Own or Backend, depending on onboarding model | Must not be used as an unapproved fourth matching criterion. Purpose needs confirmation. |
| `volunteer_skills` | Volunteer Own; Task only when needed for an authorized matching operation | Volunteer Own or Backend, according to profile-management model | Volunteer Own or Backend, according to profile-management model | Volunteer Own or Backend, according to profile-management model | Do not disclose a volunteer's full skill/profile data to unrelated organizations. |
| `disaster_tasks` | Task; public/volunteer/other-organization visibility is TBD | Task after registration and task-creation authorization checks | Task only; status follows approved lifecycle | Deny client deletion; use approved archival/retention path | Task ownership immutable. Volunteers and other organizations cannot change status. |
| `task_required_skills` | Task; other read access follows task visibility | Task | Task | Task, subject to task-history rules | Join rows inherit task authorization. Matching any/all semantics are undecided. |
| `matching_reports` | Task | Backend only, with one-report-per-task uniqueness | Backend only if report fields require finalization; no response-triggered regeneration | Deny client deletion | Task owner sees its report. Report is a recommendation, never assignment. |
| `matching_recommendations` | Task; a volunteer sees only their own relevant recommendation if product UX permits | Backend only | Backend only; treat report contents as a snapshot | Deny client deletion | No volunteer or organization client can create assignments by writing recommendations. |
| `volunteer_invitations` | Invited Volunteer Own; Task for its own task invitations | Backend only | Volunteer Own may change only the in-app response fields; Task may read but must not impersonate volunteer consent | Deny client deletion | Enforce recommendation/volunteer consistency. Exact statuses and invitation multiplicity remain TBD. |
| `organization_requests` | Task and Receive | Backend after task-owner authorization | Receive may update only the single group-level in-app response; Task may read status | Deny client deletion | Receiver accepts/declines the complete group. Email/SMS are not response paths. |
| `organization_request_members` | Task and Receive; member-level visibility follows approved privacy rules | Backend only as part of request creation | Immutable after request is sent unless an approved request-edit lifecycle exists | Backend only before send or approved retention action | Members do not have separate accept/decline rows. Membership eligibility is unresolved. |
| `notification_records` | Backend; relevant recipient/organization only where necessary and without exposing unrelated contact data | Backend only | Backend only for delivery state/attempt bookkeeping | Backend only, under retention policy | Delivery record only. It cannot record consent. Deduplication/idempotency design is TBD. |
| `audit_events` | Authorized operational readers TBD; do not expose broadly | Trusted backend only | Deny | Deny except approved retention/deletion process | Append-oriented; ordinary application clients cannot alter audit history. |

## Authorization requirements that policies must preserve

1. A row-level policy supplements, but does not replace, Express authentication, request validation, organization-membership checks, registration authorization, and task ownership checks.
2. Derive user and organization identity from verified Clerk claims. Never trust user IDs or organization IDs supplied by the mobile client.
3. The owner organization alone manages its task and status. The status lifecycle is Open → Assigned → Ongoing → Completed; invitations do not update task status.
4. Volunteer invitation responses are writable only by the invited volunteer and only through the application's authenticated response path.
5. Organization request responses are writable only by an authorized member of the receiving organization and apply to the whole group.
6. SMS/email delivery is not a response. Clients cannot mutate a notification into an acceptance or decline.
7. Protect contact details and precise location. RLS row filtering does not provide column-level secrecy by itself; avoid granting broad table reads where sensitive columns are present.
8. Enable RLS on every application table in an exposed schema. Policies and grants are separate: confirm which roles can reach each table through the Data API.
9. If the backend uses a service-role credential, it bypasses RLS. The backend must enforce the complete authorization boundary, and service credentials must stay server-side. Decide whether user-scoped Clerk JWT database access is used before writing policies.
10. Test policies using representative real Clerk tokens after confirming actual claims. Include cross-user, cross-organization, task-owner, receiver, and volunteer self-response cases.

## Current connected-project findings (2026-10-31)

The connected Supabase project is not an empty Phase 02 database:

- It reports no recorded migrations.
- It already has legacy application tables including `users`, `organizations`, `volunteers`, `disaster_types`, `volunteer_disaster_types`, `skills`, `volunteer_skills`, `tasks`, `task_skills`, `task_volunteers`, `volunteer_requests`, `ai_match_results`, and `notifications`.
- A direct row count found 2 rows in `disaster_types`, 8 rows in `skills`, and 0 rows in each of the other listed application tables. Preserve the existing lookup rows until the approved catalogue contents are confirmed.
- The existing schema has no RLS policies on its 13 RLS-enabled application tables according to the security advisor. Those tables will deny client access under RLS until intended policies are added, while backend/service-role access follows different rules.
- Supabase's security advisor reports `public.spatial_ref_sys` with RLS disabled and anon/authenticated roles currently have table privileges. The user approved enabling RLS, but the remote migration failed: the connection is `postgres`, the table is owned by `supabase_admin`, and `postgres` cannot assume that role. The remote table remains RLS-disabled. An authorized table owner or Supabase support must apply the change; enabling RLS without a policy blocks client access to the catalog table.
- A proposed migration to archive the existing tables and create the new schema is present locally as a draft, but automatic approval review rejected applying it because it would rename 13 public tables, introduce a parallel canonical schema, and enable RLS without policies. No remote schema change was made by that migration.
- The existing schema includes design choices that conflict with or go beyond current project rules (for example, `users.password_hash`, CNIC image path, assignment records, match scores, and existing notification/request state models). Do not treat it as the approved Phase 02 schema without a migration/retirement plan.

Because the existing table names collide with the proposed public-schema names and no migration history exists, settle the database baseline before creating tables or writing executable policies. Do not rename/drop existing tables or add a parallel schema without an explicit migration strategy.

## Approval gates before writing RLS SQL

1. Approve how the existing project schema is retained, migrated, isolated, or retired.
2. Confirm whether the backend reaches Postgres with a user-scoped Clerk JWT or a privileged server credential, and document its authorization checks.
3. Inspect actual Clerk JWT claims for user identity, organization context, and permissions; do not infer names from sample policies.
4. Resolve the pending organization, volunteer affiliation, profile privacy, request membership, and response lifecycle decisions that define row predicates.
5. Approve grants and Data API exposure along with policies.

Update this matrix when those decisions are made. Keep it aligned with the physical migrations and test results.
