# VolunteerConnect database data dictionary — draft

**Status:** Draft for Phase 02 review  
**Companion ERD:** [database-erd.md](./database-erd.md)  
**Database:** Supabase PostgreSQL with PostGIS  
**Identity provider:** Clerk; Supabase Auth is not used

This dictionary describes a proposed logical database. It is not a migration specification. Types and constraints marked **proposed** need schema review before migration; items marked **TBD** depend on product decisions and must not be guessed. No application tables, enums, policies, triggers, or migrations are created by this document.

**Implementation note:** The repository contains an unapplied physical migration draft whose columns and types do not fully match this logical dictionary. This file is not a description of the current connected database or an approved migration target. Reconcile it with the approved ERD and migration before schema approval; see the [Phase 02 acceptance review](./phase-02-acceptance-review.md).

## Conventions

- UUID primary keys are proposed for application entities; `gen_random_uuid()` is a possible database default, subject to migration review.
- `created_at` and `updated_at` are proposed as `timestamptz` in UTC for mutable records. Append-only records may need only `created_at`.
- Foreign keys are indexed when needed for joins, authorization, and parent lookups. Exact index definitions belong in migrations.
- `geography(Point, 4326)` stores a point in WGS 84. Coordinate order at construction is longitude, latitude. A GiST index supports spatial queries but does not set a search radius.
- All application tables require RLS. Policies must follow verified Clerk JWT claims and a tested authorization design.
- Do not store passwords, Clerk session tokens, provider credentials, or unnecessary personal data in these tables.

## Common identifiers

| Name | Proposed type | Meaning |
|---|---|---|
| `id` | `uuid` | Surrogate primary key for a parent/entity row. |
| `app_user_id` | `uuid` | References `app_users.id`; identity authority is the verified Clerk subject, not a client-supplied value. |
| `organization_id` | `uuid` | References `organizations.id`; must be checked against verified organization membership and authorization. |
| `volunteer_profile_id` | `uuid` | References `volunteer_profiles.id`. |
| `task_id` | `uuid` | References `disaster_tasks.id`. |
| `skill_id` | `uuid` | References `skills.id`. |
| `disaster_type_id` | `smallint` | References the controlled `disaster_types` lookup. |

## Table dictionary

### `app_users`

One application identity row per Clerk user. Clerk remains authoritative for authentication and account identity.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Internal application identifier. |
| `clerk_user_id` | `text` | No | UNIQUE | Clerk user identifier, populated from verified identity. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Row creation time. |
| `updated_at` | `timestamptz` | No | DEFAULT TBD | Last row update time. |

Email, phone, display name, and other Clerk profile fields are intentionally not duplicated here until their application need and privacy handling are approved.

### `organizations`

Application reference to a Clerk Organization workspace. A Clerk workspace alone is not official organization verification.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Internal application identifier. |
| `clerk_organization_id` | `text` | No | UNIQUE | Clerk Organization identifier. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Row creation time. |
| `updated_at` | `timestamptz` | No | DEFAULT TBD | Last row update time. |

Organization display name, registration status, verification evidence, and verification status are TBD; do not infer verified status from existence of a Clerk workspace.

### `volunteer_profiles`

Optional volunteer coordination profile associated with an application user. Location and organization affiliation depend on decisions recorded in the ERD.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Volunteer profile identifier. |
| `app_user_id` | `uuid` | No | FK → `app_users.id`, UNIQUE | Owner; makes the profile one-to-one with an app user. |
| `organization_id` | `uuid` | Yes | FK → `organizations.id` | Possible managing/affiliated organization. Nullable supports independent volunteers. Whether one or multiple affiliations are supported is TBD. |
| `location` | `geography(Point, 4326)` | Yes | Coordinate bounds validation | Volunteer-provided location for proximity use. Collection source, precision, update process, consent, and retention are TBD. No background tracking. |
| `local_area_knowledge` | `boolean` | TBD | CHECK only if approved | Yes/no matching criterion. Whether this is a profile-level or task-specific answer and when it is collected is TBD. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Row creation time. |
| `updated_at` | `timestamptz` | No | DEFAULT TBD | Last row update time. |

Do not add CNIC, address, phone, or other profile fields without an approved need and privacy/retention decision. Contact routing for SMS is TBD.

### `disaster_types`

Controlled reference values for allowed disaster categories.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `smallint` | No | PK | Stable internal lookup identifier. |
| `name` | `text` | No | UNIQUE; values limited to `Flood`, `Earthquake` | Display name/category. Seed values must be exactly the two approved types. |

### `skills`

Disaster-related skill catalogue used by profiles and tasks.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Skill identifier. |
| `name` | `text` | No | Uniqueness and normalization TBD | Skill label. Catalogue contents and who may maintain it require approval. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Row creation time. |

Do not seed a catalogue or add matching categories before the skill list and governance are approved.

### `volunteer_disaster_types`

Join table recording disaster categories supported by a volunteer.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `volunteer_profile_id` | `uuid` | No | PK part; FK → `volunteer_profiles.id` | Volunteer profile. |
| `disaster_type_id` | `smallint` | No | PK part; FK → `disaster_types.id` | Supported disaster category. |

Composite primary key `(volunteer_profile_id, disaster_type_id)` prevents duplicate links. Whether this attribute is needed in addition to disaster-related skills requires confirmation; it is in the proposed table list.

### `volunteer_skills`

Join table linking volunteer profiles to catalogue skills.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `volunteer_profile_id` | `uuid` | No | PK part; FK → `volunteer_profiles.id` | Volunteer profile. |
| `skill_id` | `uuid` | No | PK part; FK → `skills.id` | Skill. |

Composite primary key `(volunteer_profile_id, skill_id)` prevents duplicate links. Skill selection rules are TBD.

### `disaster_tasks`

Disaster task owned by its creating organization.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Task identifier. |
| `organization_id` | `uuid` | No | FK → `organizations.id` | Owning organization; immutable ownership is enforced by backend and database authorization. |
| `disaster_type_id` | `smallint` | No | FK → `disaster_types.id` | Flood or Earthquake category. |
| `location` | `geography(Point, 4326)` | No | Coordinate bounds validation | Affected task location. Address/description fields and location capture details are TBD. |
| `status` | `text` | No | CHECK in approved schema | Lifecycle values: `Open`, `Assigned`, `Ongoing`, `Completed`. Only the owning organization changes it; invitation responses do not change it automatically. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Creation time. |
| `updated_at` | `timestamptz` | No | DEFAULT TBD | Last update time. |

Task title, description, urgency, dates, and other operational fields are not specified here because they need product/schema review. Do not add new task statuses.

### `task_required_skills`

Join table linking tasks to required skills.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `task_id` | `uuid` | No | PK part; FK → `disaster_tasks.id` | Task. |
| `skill_id` | `uuid` | No | PK part; FK → `skills.id` | Required skill. |

Composite primary key prevents duplicate requirements. Whether multiple skills mean any-match or all-match is unresolved.

### `matching_reports`

Recommendation report generated for a task.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Report identifier. |
| `task_id` | `uuid` | No | FK → `disaster_tasks.id`; UNIQUE | Task for which report was generated. UNIQUE enforces at most one report per task. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Report creation time. |

Report status, algorithm version, distance threshold, score, weights, ranking, and rerun metadata are not defined until the associated decisions are approved. Responses must not cause a report rerun.

### `matching_recommendations`

One recommended volunteer in a matching report; recommendation is not assignment.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Recommendation identifier. |
| `matching_report_id` | `uuid` | No | FK → `matching_reports.id` | Parent report. |
| `volunteer_profile_id` | `uuid` | No | FK → `volunteer_profiles.id` | Recommended volunteer. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Recommendation creation time. |

Whether duplicate volunteer rows within one report are prohibited should be enforced with `UNIQUE(matching_report_id, volunteer_profile_id)` if confirmed during physical schema review. Explainability fields may represent only skills, proximity, and local-area knowledge; score/ranking values are TBD.

### `volunteer_invitations`

Volunteer-level invitation and in-app response. Invitation state is independent from task state.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Invitation identifier. |
| `matching_recommendation_id` | `uuid` | No | FK → `matching_recommendations.id` | Recommendation that led to this invitation. |
| `volunteer_profile_id` | `uuid` | No | FK → `volunteer_profiles.id` | Invited volunteer; must correspond to the recommendation's volunteer (enforce in backend/database design). |
| `response_status` | `text` | No | Allowed values TBD | Invitation/response lifecycle. Volunteers accept or decline inside the application. Exact states and expiry behavior are unresolved. |
| `responded_at` | `timestamptz` | Yes | TBD | Time of in-app response, if recorded. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Invitation creation time. |

Do not store a response inferred from SMS/email. Do not add a response cutoff or simultaneous-invitation rule without approval.

### `organization_requests`

Cross-organization request for a volunteer group. Response is made once at request level by the receiving organization.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Request identifier. |
| `task_id` | `uuid` | No | FK → `disaster_tasks.id` | Task whose owner made the request. |
| `receiving_organization_id` | `uuid` | No | FK → `organizations.id` | Organization that receives and responds to the whole group. |
| `response_status` | `text` | No | Allowed values TBD | Group-level request status. Exact states and expiry rules are unresolved. |
| `responded_at` | `timestamptz` | Yes | TBD | Time of in-application organization response, if recorded. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Request creation time. |

Sender organization is derived through `task_id` to avoid a second possibly inconsistent owner reference. A group decision must not be modeled as independent member accept/decline states.

### `organization_request_members`

Join table listing the complete requested volunteer group.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `organization_request_id` | `uuid` | No | PK part; FK → `organization_requests.id` | Parent group request. |
| `volunteer_profile_id` | `uuid` | No | PK part; FK → `volunteer_profiles.id` | Volunteer included in the request. |

Composite primary key prevents duplicate member inclusion. Require at least one member per request using an approved transactional/database design. Whether members must belong to the receiving organization is TBD.

### `notification_records`

Delivery attempt record for SMS/email notifications. This table is not a response channel.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Notification record identifier. |
| `volunteer_invitation_id` | `uuid` | Yes | FK → `volunteer_invitations.id` | Related individual invitation, when applicable. |
| `organization_request_id` | `uuid` | Yes | FK → `organization_requests.id` | Related group request, when applicable. |
| `channel` | `text` | No | `SMS` or `email`, per notification rule | Delivery channel. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Attempt record creation time. |

The relationship requires exactly one parent (`volunteer_invitation_id` or `organization_request_id`); add a CHECK constraint during schema implementation. Delivery status, provider, provider message ID, deduplication/idempotency key, and retry policy depend on provider selection and are TBD. Keep credentials out of this table.

### `audit_events`

Append-oriented record of important system activity.

| Column | Proposed type | Null? | Key / constraint | Definition |
|---|---|---:|---|---|
| `id` | `uuid` | No | PK | Event identifier. |
| `actor_app_user_id` | `uuid` | Yes | FK → `app_users.id` | User actor; nullable for system-generated events. |
| `organization_id` | `uuid` | Yes | FK → `organizations.id` | Organization context, if relevant. |
| `disaster_task_id` | `uuid` | Yes | FK → `disaster_tasks.id` | Task context, if relevant. |
| `event_type` | `text` | No | Vocabulary TBD | Event name; controlled values need review. |
| `created_at` | `timestamptz` | No | DEFAULT TBD | Event time. |

Additional context/payload fields, permitted sensitive content, retention, and deletion behavior are TBD. Avoid storing secrets or unnecessary personal information. Ordinary application clients must not mutate audit records.

## Cross-table integrity rules

1. Every application table has a primary key (join tables use composite keys) and RLS enabled.
2. `clerk_user_id` and `clerk_organization_id` are unique external identity references, never trusted from an unverified client payload.
3. A task has exactly one owning organization; task management and status changes are limited to that organization.
4. A task can have at most one matching report (`UNIQUE(matching_reports.task_id)`). A report is a recommendation, not an assignment.
5. Task status and invitation/request response status are separate data fields and separate state machines.
6. Responses are recorded in-app. Notification records capture delivery attempts only.
7. A cross-organization response applies to the request as a whole, not each member row.
8. Geography inputs use longitude/latitude with bounds validation. Location access and update behavior must not implement background tracking.
9. Do not cascade-delete task, matching, invitation/request, or audit history. Exact archival and deletion rules need approval.
10. RLS policy definitions wait for inspection and testing of actual Clerk JWT claims.

## Unresolved schema inputs

The following must be decided before the draft becomes migration-ready:

- Organization registration and verification, plus the authorized task-creator definition.
- Volunteer onboarding and organization-affiliation cardinality/management.
- Skill catalogue, catalogue manager, and multiple-skill semantics.
- Location source, collection/update process, privacy, and retention.
- Matching distance threshold, score, weighting, ranking, and tie-breaking.
- Invitation and request state vocabularies, expiry/no-response behavior, and simultaneous invitations.
- Contact-data source and handling for SMS/email delivery.
- Notification provider and idempotency/delivery fields.
- CNIC/privacy, data retention, account deletion, and audit retention.
- Verified Clerk JWT claims and database authorization design.

Keep this dictionary aligned with [the ERD](./database-erd.md) and update both alongside any approved migration. The migration files become the physical source of truth.
