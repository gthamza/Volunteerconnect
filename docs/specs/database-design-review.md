# VolunteerConnect database design review

**Status:** Review findings; schema not approved for migrations  
**Scope:** Review of all proposed Phase 02 tables, relationships, and schema-affecting unresolved decisions  
**Reviewed documents:** [ERD](./database-erd.md), [data dictionary](./database-data-dictionary.md), [Phase 02 specification](./phase-02.md)

See also the [RLS permission matrix](./database-rls-permission-matrix.md), which records the intended row access boundaries and findings from the connected Supabase project.

This review does not approve implementation choices or resolve product questions. The tables below are the 16 entities in the Phase 02 proposal. Conclusions are design guidance for the next review; no migrations or database changes are included.

## Summary

The proposed set covers the major identity references, organization-owned tasks, skill joins, one-report-per-task recommendation structure, individual invitations, group organization requests, notification attempts, and audit events. The core ownership and consent boundaries are represented.

The design is **not migration-ready**. In particular, volunteer affiliation and location semantics, local-area-knowledge ownership, skill criteria, invitation/request lifecycles, notification idempotency, matching snapshot explainability, Clerk claim mapping, and data retention remain undecided. The ERD and dictionary also need a consistency pass before approval.

## Review of each proposed table

| Table | Review | Follow-up before schema approval |
|---|---|---|
| `app_users` | Appropriate minimal link to Clerk identity; unique external subject is necessary. | Define lifecycle/synchronization behavior when Clerk user data changes or an account is deleted. Do not duplicate contact fields without a stated need. |
| `organizations` | Appropriate link to Clerk Organization; workspace identity is not proof of official registration. | Decide how approved registration/verification and task-creation authorization are represented. This may require an application-owned authorization attribute or relation; do not infer it from Clerk membership. |
| `volunteer_profiles` | Optional one-to-one profile supports independent volunteers. The draft's nullable `organization_id` only represents one affiliation. | Decide whether profile management/affiliation comes solely from Clerk membership, supports one organization, or supports multiple. If multiple, use a membership/assignment relation instead of a single FK. Decide where local-area knowledge lives and whether location is current, task-specific, or otherwise time-bounded. |
| `disaster_types` | Lookup table correctly constrains categories to Flood and Earthquake. | Decide stable seed IDs and migration ownership. Keep this classification distinct from matching criteria unless product rules explicitly say otherwise. |
| `skills` | Required catalogue entity, but its values and governance are intentionally absent. | Approve catalogue, maintenance authority, naming/uniqueness rules, and any deprecation behavior before seeding or adding catalogue constraints. |
| `volunteer_disaster_types` | Relationship is structurally valid as a many-to-many join. Its business meaning is not specified elsewhere. | Clarify what a volunteer's supported disaster type means. It must not silently become a fourth matching criterion; matching has exactly three criteria. Remove it if it has no separate approved purpose. |
| `volunteer_skills` | Appropriate many-to-many relation between profiles and skills. | Confirm whether any attributes such as proficiency or verification are required. Do not add them without approval; matching semantics across multiple skills remain open. |
| `disaster_tasks` | Correctly identifies one owning organization, one disaster type, a location, and the approved lifecycle. | Define required task fields and location collection/validation. A CHECK can restrict status values but does not enforce legal transition order; ensure the backend/database authorization design enforces both owner-only changes and permitted transitions. Clarify whether task visibility to other organizations/volunteers is needed for RLS. |
| `task_required_skills` | Appropriate many-to-many relation. | Decide whether multiple required skills mean any or all for matching. The join itself must not encode either interpretation. |
| `matching_reports` | Correct one-task-to-zero-or-one-report relation for a report that may not yet exist; unique `task_id` enforces at most one. | Confirm creation boundary and atomicity so report generation cannot create duplicates. A unique key alone does not guarantee a report exists. Decide the minimal snapshot metadata needed for explainability without inventing scores, weighting, or ranking. |
| `matching_recommendations` | Appropriate child rows for recommended profiles. Correctly models recommendation separately from assignment. | Decide whether a volunteer can appear only once per report (likely a unique pair, but needs review). Define the explanation data needed for the three criteria and how the report remains understandable if profile skills/location later change. Do not add scoring/ranking without approval. |
| `volunteer_invitations` | Correct separate volunteer response record; in-app response rule is clear. | The recommendation FK plus direct volunteer FK duplicates identity. Either remove the direct FK or enforce that the invitation's volunteer equals the recommendation's volunteer (for example, a composite FK/unique target). Decide whether each recommendation can produce only one invitation or multiple; the current one-to-many ERD allows repeats and needs resolution. Approve response states and expiry before adding a CHECK or default. |
| `organization_requests` | Parent row is the right place for one receiving-organization decision on the whole group. Deriving sender from the task avoids inconsistent duplicate owner IDs. | Decide request lifecycle, duplicate requests to the same receiving organization/task, and whether a receiving organization may be the task owner. Confirm this request is authorized by the task owner. |
| `organization_request_members` | Correct join table for group membership; composite key prevents duplicate member rows. | Define the eligibility/ownership rule for included volunteers and verify they belong to the receiving organization if required. A normal row-level CHECK cannot ensure a request has at least one member; enforce through a transaction/service boundary or approved deferred database mechanism. The receiving organization's decision remains on the parent request only. |
| `notification_records` | Correctly treats SMS/email as delivery attempts rather than responses. The proposed two nullable parent FKs can represent either individual or group notifications. | Enforce exactly one parent with a CHECK. Decide event/attempt model, provider, status vocabulary, idempotency key, retries, and uniqueness that prevents duplicate notifications. Confirm who can read these records without exposing contact details. Reminder schedule has one reminder after 20 minutes; do not invent a final no-response cutoff. |
| `audit_events` | Append-only intent is appropriate, but current context FKs only cover user, organization, and task. | Decide which events must be audited, the event vocabulary, safe metadata shape, access, retention, and account-deletion behavior. Avoid an unconstrained polymorphic target unless its integrity limitations are accepted. Ensure trusted backend writes and ordinary clients cannot mutate records. |

## Relationship review

### Relationships represented coherently

- `app_users` to `volunteer_profiles`: one user has zero or one profile; every profile has one owner.
- `organizations` to `disaster_tasks`: one organization owns many tasks; every task has one owner.
- Profiles to skills/disaster types and tasks to required skills: many-to-many join tables with composite keys.
- Task to matching report: zero or one report at a time; `UNIQUE(task_id)` can enforce the upper bound.
- Matching report to recommendations: one report can contain many recommendation rows.
- Organization request to members: the member join table models the requested group while the parent holds the group response.

### Relationships needing constraints or clarification

1. **Profile affiliation:** A single nullable `volunteer_profiles.organization_id` cannot represent multiple affiliations. Clerk membership is already authoritative, so decide whether the app database needs a mirrored manager/affiliation relation at all and how it is synchronized.
2. **Recommendation to invitation:** Direct `volunteer_profile_id` duplicates the volunteer reachable through `matching_recommendation_id`; consistency must be enforced or the redundant FK removed. The permitted count of invitations per recommendation is undecided.
3. **Request group membership:** The FKs do not prove that each listed profile belongs to `receiving_organization_id`. The receiving-organization eligibility rule and enforcement path are unresolved.
4. **Notifications to a parent:** Require exactly one of the invitation/request parent FKs. Add idempotency constraints only after deciding what counts as the same notification event and how provider retries are represented.
5. **Report generation:** Unique `task_id` prevents a second report, but does not guarantee one report after the matching operation completes. Define that operation's atomic write boundary in its future phase.
6. **Audit context:** Independent nullable context FKs allow ambiguous combinations. Define allowed event context combinations or use a reviewed event-specific structure; do not silently add cascading references.
7. **Delete behavior:** Restricting deletion of operational history is sensible, but account deletion/retention is undecided. Choose FK actions per approved lifecycle rather than applying a blanket cascade or restrict rule.

## ERD and dictionary consistency findings

1. `local_area_knowledge` appears in the dictionary but not the ERD. Its owner and scope are unresolved (volunteer profile, task-specific response, or another approved form); reconcile both docs after the decision.
2. The dictionary adds fields not shown in the ERD (timestamps, response timestamps, `event_type`). That is acceptable for a logical key-focused diagram only if clearly labeled; before migration approval, synchronize the ERD's physical columns and constraints with the migration schema.
3. `notification_records` is described as exactly one of two parents in the dictionary, while the ERD only marks each FK nullable. Add the XOR CHECK to both the physical schema and diagram once accepted.
4. The ERD allows multiple invitations per recommendation, while the dictionary leaves repeat invitation count unresolved. Clarify cardinality and update both artifacts.
5. The ERD puts a single `organization_id` on the profile and separately notes affiliation cardinality is pending. Do not mistake that proposed FK for an approved multi-organization model.
6. `volunteer_disaster_types` is in the proposed table set but has no confirmed product purpose and could be misused as an extra matching filter. Record its approved non-matching purpose or remove it from the final schema.

## Unresolved decisions that affect schema

These are blockers for final column, relationship, constraint, policy, or retention design:

| Decision | Schema impact |
|---|---|
| Organization registration/verification and task authorization | Whether `organizations` needs verified-registration fields/relations and what DB/backend authorization attributes can be trusted. |
| Volunteer onboarding and organization-affiliated account management | Whether affiliation is absent, single-valued, or a join table; how profile ownership and receiving-organization member checks work. |
| Skill catalogue and catalogue manager | `skills` seed data, uniqueness, maintenance permissions, and possible lifecycle fields. |
| Multiple-skill matching rules | Matching query semantics; must not be encoded as any/all until selected. |
| Volunteer location collection/update and location source | Nullability, granularity, location history/current-location model, consent metadata, indexes, and privacy. |
| Matching distance threshold | Query behavior and perhaps report evidence fields; not a reason to invent a threshold or store a ranking. |
| Matching score, weighting, ranking, tie-breaking | Whether any score/order fields exist in recommendations; currently unresolved and not to be added as assumptions. |
| Local-area knowledge definition and scope | Whether `local_area_knowledge` is profile-, task-, or request-scoped; owner, timestamp, and validity. |
| Invitation states, expiry, no-response behavior | `response_status` allowed values, timestamps, expiration fields, reminders, and terminal-state constraints. Final no-response cutoff is explicitly undecided. |
| Simultaneous task invitations | Uniqueness and cardinality constraints for recommendation/invitation and volunteer/task pairs. |
| Organization-request rules | Member eligibility, duplicate request uniqueness, response states, and whether the whole group decision has any member-level consequences. |
| SMS/email providers and duplicate prevention | Notification status/provider fields, idempotency key, provider ID, retry rows, and uniqueness scope. |
| Contact-data source and privacy | Whether personal contact data is stored at all, where it is read from, and access boundaries. |
| CNIC privacy, retention, account/data deletion | Sensitive columns (if any), archival/soft-delete behavior, FK deletion rules, and retention jobs. |
| Audit scope and retention | Event columns/payload design, write path, indexes, access, and deletion restrictions. |
| Actual Clerk JWT claims and RLS authorization design | Policy predicates and whether database calls run with user-scoped JWT or trusted backend credentials; never assume claim names. |
| Production deployment/provider costs | Environment separation and operational configuration; not a reason to add secrets or provider credentials to the schema. |

## Recommended next review sequence

1. Resolve the product decisions above that change relationships or stored fields.
2. Confirm the table inventory, especially `volunteer_disaster_types` and whether app-owned organization-affiliation data is required.
3. Decide the integrity approach for recommendation/invitation consistency, notification parent XOR/idempotency, and nonempty request groups.
4. Confirm actual Clerk claims and the intended client/backend database access path before RLS policy design.
5. Update the ERD and dictionary together, then review the resulting physical schema before creating migrations.

No Phase 03 or later feature implementation is authorized by this review.
