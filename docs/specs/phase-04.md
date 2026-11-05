# Phase 04 — Disaster Task Management

## 1. Phase Overview

**Project:** VolunteerConnect  
**Phase:** 04  
**Title:** Disaster Task Management

### Objective

Implement disaster-relief task creation and management for registered and authorized organizations.

At the end of this phase, organizations should be able to:
- Create disaster-relief tasks.
- View their created tasks.
- View task details.
- Edit their tasks.
- Manage task status.
- Monitor the progress of their tasks.

Independent volunteers must not be allowed to create, edit, or manage tasks.

## 2. Technology Stack

Use the existing project stack:

| Area | Technology |
|---|---|
| Mobile | React Native + Expo |
| Language | TypeScript |
| Navigation | Expo Router |
| Authentication | Clerk |
| Organization management | Clerk Organizations |
| Database | Supabase PostgreSQL |
| Geographic data | PostGIS |
| Backend | Node.js + Express |
| Styling | NativeWind |
| API state | TanStack Query |
| Forms | React Hook Form + Zod |
| Testing | Jest + React Native Testing Library |

Do not introduce another authentication provider or replace existing technologies.

## 3. User Permissions

### 3.1 Registered Organizations

Authorized organization members can:
- Create disaster tasks for their organization.
- View their organization's tasks.
- View task details.
- Edit permitted task information.
- Change task status through the approved lifecycle.
- Monitor task progress.

### 3.2 Independent Volunteers

Independent volunteers:
- Cannot create tasks.
- Cannot edit tasks.
- Cannot change task status.
- Cannot manage organization tasks.

### 3.3 Organization-Affiliated Volunteers

Organization-affiliated volunteers:
- Cannot independently create or manage tasks.
- Can access task-related information only when explicitly permitted by the application's later task and assignment workflows.

## 4. Mobile Application Screens

This phase introduces approximately four screens.

### Screen 1 — Organization Dashboard

Purpose: Provide an overview of the organization's disaster-relief tasks.

Possible information:
- Total tasks.
- Open tasks.
- Assigned tasks.
- Ongoing tasks.
- Completed tasks.
- Recently created tasks.

Actions:
- Create Task.
- View All Tasks.
- Open Task Details.

Only display task information belonging to the authenticated organization.

### Screen 2 — Task List

Purpose: Display tasks created by the organization.

Each task card should display:
- Task title or identifying description.
- Disaster type.
- Affected location.
- Required volunteer count.
- Task status.
- Creation date.

Features:
- View task details.
- Navigate to task editing.
- Filter tasks by status, if useful.

Do not display tasks belonging to other organizations unless an explicitly approved access workflow permits it.

### Screen 3 — Create Task

Purpose: Allow an authorized organization to create a disaster-relief task.

Required task information:

1. Disaster type:
   - Flood
   - Earthquake

2. Affected location:
   - Select location using an appropriate map or location-selection interface.
   - Support manual location selection.
   - Store geographic information using the existing PostGIS-compatible database.

3. Required disaster-related skills:
   - Select from the existing approved skills catalogue.
   - Support the required skill relationships.

4. Number of volunteers required:
   - Enter the required volunteer count.
   - Validate that the value is valid.

5. Task description:
   - Describe the relief activity and requirements.

6. Task status:
   - Automatically set to Open when the task is created.
   - Do not allow users to choose another initial status.

Actions:
- Create Task.
- Cancel.

After successful creation, save the task and display its details or return to the task list with success feedback.

### Screen 4 — Task Details

Purpose: Display complete information about a selected task.

Display:
- Task identifier.
- Disaster type.
- Affected location.
- Required skills.
- Number of volunteers required.
- Task description.
- Current task status.
- Creating organization.
- Creation date.
- Last updated date.

Actions:
- Edit Task.
- Assign Task.
- Start Task.
- Complete Task.

Display only actions permitted by the current task status and the authenticated user's organization permissions.

## 5. Task Lifecycle

The application must use exactly this task lifecycle:

Open → Assigned → Ongoing → Completed

### 5.1 Open

- Automatically assigned when an organization creates a task.
- Indicates that the task has been created.
- The task can be viewed and managed by its owning organization.

### 5.2 Assigned

- Reached through the organization's Assign Task action.
- Indicates that the task has moved to the assigned stage.

### 5.3 Ongoing

- Reached through the organization's Start Task action.
- Indicates that the task is in progress.

### 5.4 Completed

- Reached through the organization's Complete Task action.
- Indicates that the task has been completed.

Important rules:
- Only the task-owning organization can change task status.
- Status changes must be validated by the backend.
- Do not allow invalid or skipped status transitions.
- Do not confuse task status with volunteer invitation or response status.
- Do not automatically assign volunteers when a task is created.

## 6. Database Requirements

Use the existing Phase 02 database foundation.

### 6.1 disaster_tasks

Review the existing table before making changes.

The proposed task fields include:

- id
- organization_id
- disaster_type_id
- description
- affected_location
- required_volunteer_count
- status
- created_at
- updated_at

The organization identifier must identify the organization that owns the task.

The affected location must use the project's approved PostGIS geographic representation.

### 6.2 task_required_skills

This table connects tasks with required skills.

Proposed fields:

- id
- task_id
- skill_id
- created_at

A task may require multiple skills.

Prevent duplicate skill associations for the same task.

### 6.3 Database Rules

- Use foreign keys.
- Add appropriate indexes.
- Validate required fields.
- Enforce valid disaster types.
- Enforce valid task statuses.
- Enable Row Level Security.
- Prevent unauthorized organization access.
- Prevent unauthorized task modifications.

Do not create duplicate tables if they already exist from Phase 02.

Do not create matching reports, volunteer invitations, or assignment workflows in this phase.

## 7. Backend Requirements

Implement task management using the existing Express backend.

Required capabilities:

### Task Creation
- Create a task.
- Validate all required fields.
- Verify organization membership and permissions.
- Automatically set initial status to Open.
- Associate the task with the authenticated organization.

### Task Retrieval
- Retrieve tasks belonging to the authenticated organization.
- Retrieve an individual task.
- Prevent unauthorized access to other organizations' task records.

### Task Editing
- Update permitted task information.
- Validate incoming information.
- Verify task ownership.
- Prevent unauthorized edits.

### Task Status Management
- Assign Task.
- Start Task.
- Complete Task.

The backend must validate the current task status before accepting each transition.

### API Security
- Verify Clerk authentication tokens.
- Verify organization membership and permissions.
- Enforce task ownership.
- Validate requests with Zod.
- Apply database security policies.
- Use appropriate HTTP status codes.
- Never expose Supabase service-role credentials to the mobile application.

## 8. API Endpoint Suggestions

Use existing backend naming conventions where possible.

Suggested endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| POST | /api/tasks | Create a task |
| GET | /api/tasks | Get the organization's tasks |
| GET | /api/tasks/:id | Get task details |
| PATCH | /api/tasks/:id | Edit task information |
| PATCH | /api/tasks/:id/status | Change task status |

These are suggested routes. Reuse existing endpoints if equivalent functionality already exists.

The final request and response formats must be documented.

## 9. Location Requirements

Task location is important because the matching system in Phase 05 will use proximity as one of its matching criteria.

Requirements:
- Allow an organization to select the affected location.
- Support map-based selection.
- Support manual location entry or selection.
- Store geographic information using PostGIS.
- Validate geographic coordinates.
- Display the affected location on the task details screen.
- Do not implement continuous location tracking.

Do not decide the future matching radius or distance-scoring method in Phase 04.

## 10. Validation Requirements

Use React Hook Form and Zod.

Validate:
- Disaster type is selected.
- Affected location is provided.
- Required skills are selected according to the approved rules.
- Volunteer count is a valid positive integer.
- Task description is valid.
- Status is assigned by the backend during creation.
- Task identifiers are valid.
- Status transitions are valid.

Validate data in both the mobile application and backend.

## 11. Security Requirements

- Only authorized organization members can create tasks.
- Only the owning organization can edit its tasks.
- Only the owning organization can change task status.
- Independent volunteers cannot create or manage tasks.
- Users cannot modify task ownership through request payload manipulation.
- All task APIs must verify authentication.
- All task APIs must enforce authorization.
- Supabase RLS must protect task records.
- Cross-organization access must be tested.
- Do not rely on frontend visibility checks as the security mechanism.

## 12. Testing Requirements

### Task Creation
- Create a Flood task.
- Create an Earthquake task.
- Save the affected location.
- Save multiple required skills.
- Save the required volunteer count.
- Verify that new tasks receive Open status.
- Reject invalid task information.

### Task Retrieval
- Retrieve the organization's tasks.
- Retrieve an individual task.
- Reject unauthorized task access.

### Task Editing
- Edit permitted task information.
- Reject edits from unauthorized users.
- Prevent changes to task ownership.

### Task Status
- Open → Assigned.
- Assigned → Ongoing.
- Ongoing → Completed.
- Reject invalid transitions.
- Reject status changes by non-owning organizations.

### Security
- Independent volunteers cannot create tasks.
- Organization members cannot manage another organization's tasks.
- Backend authorization is enforced.
- RLS policies are effective.

### Mobile UI
- Test loading states.
- Test error states.
- Test empty states.
- Test form validation.
- Test successful task creation.
- Test status action visibility and execution.

## 13. Out of Scope

Do not implement these features in Phase 04:

- AI-assisted volunteer matching.
- Volunteer recommendation lists.
- Matching reports.
- Volunteer invitations.
- Volunteer acceptance or decline.
- Cross-organization volunteer requests.
- Volunteer assignment records.
- SMS notifications.
- Email notifications.
- Twilio integration.
- Automatic volunteer selection.
- Volunteer replacement.
- Background GPS tracking.

These belong to later phases.

## 14. Expected Deliverables

1. Organization Dashboard.
2. Task List screen.
3. Create Task screen.
4. Task Details screen.
5. Task creation API.
6. Task retrieval APIs.
7. Task editing API.
8. Task status management API.
9. Database migrations or approved schema updates.
10. Required task-skill relationships.
11. RLS policies.
12. Clerk-based backend authorization.
13. Form validation.
14. Unit tests.
15. Integration tests.
16. Updated API and database documentation.

## 15. Implementation Order

Follow this order:

1. Review Phase 01, Phase 02 and Phase 03 implementations.
2. Inspect existing disaster_tasks and task_required_skills tables.
3. Confirm task data fields and organization ownership relationships.
4. Implement necessary database migrations.
5. Configure and test RLS policies.
6. Implement task creation API.
7. Implement task retrieval APIs.
8. Implement task editing API.
9. Implement task status management API.
10. Build Organization Dashboard.
11. Build Task List.
12. Build Create Task.
13. Build Task Details.
14. Integrate the mobile screens with backend APIs.
15. Add loading, error and empty states.
16. Run backend and mobile tests.
17. Verify organization permissions and task ownership.
18. Complete the Phase 04 audit.

## 16. Acceptance Criteria

Phase 04 is complete when:

- Authorized organizations can create disaster tasks.
- Both Flood and Earthquake task types are supported.
- Organizations can provide affected locations.
- Organizations can select required skills.
- Organizations can specify the number of volunteers required.
- Organizations can provide task descriptions.
- New tasks automatically receive Open status.
- Organizations can view their own tasks.
- Organizations can view task details.
- Organizations can edit permitted task information.
- Task status follows Open → Assigned → Ongoing → Completed.
- Only the task-owning organization can change task status.
- Independent volunteers cannot create, edit, or manage tasks.
- Backend authorization works.
- Supabase RLS policies work.
- Tests pass.
- Phase 01–03 functionality remains operational.

## 17. Next Phase

After Phase 04 is complete, proceed to:

**Phase 05 — Volunteer Matching System**

Phase 05 will use the task information and volunteer profiles to identify suitable volunteers using exactly three criteria:

1. Disaster-related skills.
2. Proximity to the affected location.
3. Local-area knowledge (Yes/No).

The system will generate one matching report per task.

Matching will provide recommendations only. It will not automatically assign volunteers.

Do not implement Phase 05 during Phase 04.