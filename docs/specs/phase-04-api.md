# Phase 04 task API

Base path: `/api/v1`. All routes require a verified Clerk session and an active Clerk organization. The organization ID and role are taken from the verified session, never from the request body. Responses use `{ "data": ... }` for success and `{ "error": { "code", "message" } }` for errors.

## Routes

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/tasks` | Create an Open task for the authorized organization. |
| `GET` | `/tasks` | List tasks belonging to the authorized organization. |
| `GET` | `/tasks/:id` | Read one task owned by the authorized organization. |
| `PATCH` | `/tasks/:id` | Update permitted task fields. Ownership and status are not editable here. |
| `PATCH` | `/tasks/:id/status` | Apply one valid next status in the lifecycle. |

Create body:

```json
{
  "disasterTypeId": "<uuid>",
  "description": "Deliver emergency water supplies",
  "affectedLocation": { "latitude": 33.6844, "longitude": 73.0479 },
  "requiredSkillIds": ["<uuid>"],
  "requiredVolunteerCount": 6
}
```

The API accepts Flood and Earthquake disaster type IDs from the catalogue, catalogue skill IDs, bounded WGS84 coordinates, a non-empty description, and a positive integer count. Duplicate skill IDs and unknown IDs are rejected. The server sets status to `Open` and converts coordinates to the existing PostGIS `geography(Point, 4326)` representation. The task response returns coordinates as `{ latitude, longitude }`.

The status body is `{ "status": "Assigned" }`, `{ "status": "Ongoing" }`, or `{ "status": "Completed" }`. Only `Open → Assigned → Ongoing → Completed` is accepted. The update body does not accept `organizationId`, task status, or other unlisted fields.

`Open → Assigned` is additionally gated by a server-side `TaskAssignmentReadiness` integration point. It must confirm that the later-phase matching report and volunteer or organization responses have been reviewed before allowing the transition. Until that integration is configured, the backend returns `409 TASK_ASSIGNMENT_NOT_READY` and leaves the task Open. The mobile Task Details screen keeps Assign Task disabled during this phase. Creating a task never assigns volunteers.

## Authorization gate

Task routes fetch the active Clerk organization's live membership roster and verify that the authenticated Clerk user is still a member with the session's role. The standard server currently allows only Clerk `org:admin` members to manage tasks and resolves the active Clerk organization through the server-side `organizations` table. An organization without a matching application record is denied with `403 ORGANIZATION_NOT_CONFIGURED`. Task ownership always uses the resolved internal `organizations.id`; client-supplied organization IDs are ignored/rejected.

This is the configured interim authorization boundary. The current `organizations` schema only links a Clerk workspace to an internal row; it does not prove official registration. Task management therefore still needs the separately approved organization verification workflow before production use can claim to restrict access to officially registered relief organizations. Do not treat Clerk organization membership or the presence of the link row as proof of registration. Tests may inject a narrower or otherwise specific authorizer.

Once authorized, every query filters by the server-resolved internal organization ID. A task belonging to another organization is returned as `404 TASK_NOT_FOUND` for detail and update operations.

## Database security boundary

The Phase 04 RLS migration enables RLS on `disaster_tasks` and `task_required_skills`, revokes direct table privileges from `anon` and `authenticated`, and grants table privileges to the server-only `service_role`. With no client policies, direct mobile/Data API access is denied. The service role bypasses RLS, so Express authorization remains mandatory for every task operation. This is a fail-closed boundary; it does not provide tenant-aware SQL policies for registered organizations. Such policies must wait for an observed active-organization Clerk token accepted by Supabase and an approved registration/permission model.
