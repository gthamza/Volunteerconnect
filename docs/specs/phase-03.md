# Phase 03 — User Profiles & Volunteer Management

## 1. Phase Overview

**Project:** VolunteerConnect
**Phase:** 03
**Title:** User Profiles & Volunteer Management

### Objective

Build the user profile and volunteer management features for VolunteerConnect.

This phase will allow:
- Independent volunteers to create and manage their profiles.
- Organization-affiliated volunteers to maintain their volunteer information.
- Registered organizations to view and manage their affiliated volunteers.
- Volunteers to provide their disaster-related skills, supported disaster types, location, and local-area knowledge.

The information collected in this phase will later be used by the matching system in Phase 05.

---

## 2. Technology Stack

Use the already agreed technology stack:

| Area | Technology |
|---|---|
| Mobile application | React Native |
| Framework | Expo |
| Language | TypeScript |
| Navigation | Expo Router |
| Authentication | Clerk |
| Organization management | Clerk Organizations |
| Database | Supabase PostgreSQL |
| Geospatial data | PostGIS |
| Backend | Node.js + Express |
| Styling | NativeWind |
| API state | TanStack Query |
| Local state | Zustand, only if needed |
| Forms | React Hook Form |
| Validation | Zod |
| Testing | Jest + React Native Testing Library |

Do not introduce another authentication provider.

---

## 3. User Types

VolunteerConnect supports three user categories:

### 3.1 Independent Volunteer

An independent volunteer:
- Creates and manages their own volunteer profile.
- Adds disaster-related skills.
- Selects supported disaster types.
- Provides their location.
- Answers whether they have local-area knowledge.
- Can view and update their own profile.

### 3.2 Organization-Affiliated Volunteer

An organization-affiliated volunteer:
- Has a personal volunteer profile.
- Is associated with an organization.
- Provides their volunteer skills and other profile information.
- Can view their organization affiliation.
- Can update their own permitted profile information.

### 3.3 Registered Organization

An organization:
- Can view its affiliated volunteers.
- Can view relevant volunteer profile information.
- Can manage its volunteer relationships according to approved permissions.
- Cannot edit another organization's volunteers.

Only registered and authorized organizations can manage organization-related volunteer records.

---

## 4. Mobile Application Screens

This phase is expected to introduce approximately five screens.

### Screen 1: Volunteer Profile

Purpose: Display the volunteer's profile.

Information displayed:
- Profile name
- Volunteer category
- Contact information, where permitted
- Disaster-related skills
- Supported disaster types
- Location
- Local-area knowledge
- Organization affiliation, if applicable

Actions:
- Edit Profile
- View Organization, if affiliated

### Screen 2: Edit Volunteer Profile

Purpose: Allow volunteers to update their profile information.

Editable information:
- Name or profile details
- Contact information, where permitted
- Location
- Local-area knowledge
- Other approved volunteer information

The application must validate information before saving.

### Screen 3: Skills Selection

Purpose: Allow volunteers to select their disaster-related skills.

Examples of possible skills:
- First Aid
- Medical Assistance
- Search and Rescue
- Emergency Response
- Logistics
- Food Distribution
- Shelter Support
- Communication Support

**Important:** These are examples only. The final skill catalogue must be approved before implementation.

Requirements:
- Display available skills.
- Allow volunteers to select multiple skills.
- Save selected skills in the database.
- Allow volunteers to update their selections.

### Screen 4: Organization Profile

Purpose: Display organization information.

Information may include:
- Organization name
- Organization description
- Organization contact information
- Organization affiliation information

Only authorized organization members can access organization-management actions.

### Screen 5: Organization Volunteer Management

Purpose: Allow an organization to view its affiliated volunteers.

Features:
- Display affiliated volunteers.
- Open a volunteer's profile.
- View relevant volunteer skills.
- View supported disaster types.
- View volunteer location information where permitted.
- Display volunteer affiliation status.

An organization must not access or manage volunteers belonging to another organization without an explicitly approved process.

---

## 5. Database Requirements

Use the database foundation established in Phase 02.

The following entities are relevant to this phase:

### 5.1 app_users

Stores application-level user information linked to Clerk identity.

Possible fields:
- id
- clerk_user_id
- full_name
- email
- phone
- created_at
- updated_at

Clerk remains the identity provider. Do not store passwords in Supabase.

### 5.2 volunteer_profiles

Stores volunteer-specific information.

Possible fields:
- id
- user_id
- volunteer_type
- location
- local_area_knowledge
- created_at
- updated_at

The location should support PostGIS-compatible geographic data.

The final location fields and update rules must follow the approved project decisions.

### 5.3 skills

Stores the approved skill catalogue.

Possible fields:
- id
- name
- description
- is_active
- created_at

### 5.4 volunteer_skills

Connects volunteers with their selected skills.

Possible fields:
- id
- volunteer_id
- skill_id
- created_at

A volunteer can have multiple skills.

### 5.5 disaster_types

Stores supported disaster categories.

The initial project scope includes:
- Flood
- Earthquake

### 5.6 volunteer_disaster_types

Connects volunteers with the disaster types they are willing or able to support.

Possible fields:
- id
- volunteer_id
- disaster_type_id
- created_at

### 5.7 Organization Membership

Use Clerk Organizations as the source of organization membership and membership roles.

If application-specific organization affiliation records are required, define how they relate to Clerk organization membership before implementation.

Do not create a second, conflicting organization membership system.

**Note:** The fields above are proposed design guidance. Confirm the final schema against Phase 02 migrations before creating or changing tables.

---

## 6. Backend Requirements

Use the Express backend established in Phase 02.

The backend should support the following operations.

### Volunteer Profile

- Create a volunteer profile.
- Retrieve the current user's profile.
- Update the current user's profile.
- Validate profile information.
- Retrieve permitted profile information for authorized users.

### Skills

- Retrieve available skills.
- Add skills to a volunteer profile.
- Remove skills from a volunteer profile.
- Update selected skills.

### Disaster Types

- Retrieve supported disaster types.
- Add supported disaster types to a volunteer profile.
- Remove supported disaster types.

### Organization Volunteer Management

- Retrieve volunteers affiliated with the current organization.
- Retrieve permitted volunteer profile details.
- Verify organization membership and permissions before returning data.

All endpoints must validate the authenticated user and their permissions.

The final API route names and response formats should be documented during implementation.

---

## 7. Location Requirements

Volunteer location is important because Phase 05 will use proximity as one of its three matching criteria.

Requirements:
- Allow the volunteer to provide a location.
- Support GPS-based location selection where permission is granted.
- Provide a manual or map-based alternative when GPS permission is denied.
- Store location in a format compatible with PostGIS.
- Do not continuously track volunteers.
- Do not collect background location data.

The following decisions remain pending:
- Whether location is selected during registration or later.
- Whether volunteers can provide a manually selected area.
- How frequently volunteers must update their location.
- Whether a precise coordinate or an approximate location is stored.
- Location privacy and retention rules.

Do not invent a location update frequency or tracking policy.

---

## 8. Local-Area Knowledge

Local-area knowledge is one of the three approved matching criteria.

The volunteer must be able to indicate:

- Yes — I have local-area knowledge.
- No — I do not have local-area knowledge.

Store this as a Boolean value.

Do not introduce additional scoring rules in this phase.

---

## 9. Organization Permissions

Organization volunteer management must follow these rules:

- Only authenticated organization members can access organization features.
- Verify membership using Clerk Organizations.
- Enforce organization-specific access permissions.
- An organization can view its own affiliated volunteers.
- An organization cannot edit another organization's volunteer information.
- Volunteers can update their own permitted personal information.
- Backend authorization must be enforced even if the mobile interface hides unauthorized actions.

Do not rely on frontend checks alone.

---

## 10. Security Requirements

### Authentication
- Use Clerk for authentication.
- Verify Clerk tokens in the backend.
- Do not introduce Supabase Auth as a second authentication system.

### Database Security
- Enable Row Level Security on every application table.
- Write policies according to verified Clerk JWT claims and approved access rules.
- Do not guess JWT claim names.
- Test access for independent volunteers, organization members, and unauthorized users.

### Sensitive Information
- Do not expose private volunteer information unnecessarily.
- Do not expose Supabase service-role credentials in the mobile application.
- Do not log sensitive personal information.
- Restrict organization access to permitted volunteer information.

---

## 11. Validation Requirements

Use React Hook Form and Zod for form validation.

Validate:
- Required profile fields.
- Valid contact information where collected.
- Valid skill selections.
- Valid disaster-type selections.
- Valid location data.
- Local-area knowledge Boolean value.
- Duplicate skill associations.
- Duplicate disaster-type associations.

The backend must also validate incoming data. Mobile-side validation alone is insufficient.

---

## 12. Testing Requirements

### Volunteer Profile Tests
- Create a volunteer profile.
- Retrieve the correct profile.
- Update profile information.
- Reject invalid profile data.
- Prevent unauthorized profile updates.

### Skills Tests
- Retrieve available skills.
- Add multiple skills.
- Remove a selected skill.
- Prevent duplicate skill associations.

### Disaster Type Tests
- Retrieve supported disaster types.
- Save volunteer disaster-type preferences.
- Prevent duplicate associations.

### Organization Tests
- Organization members can view their affiliated volunteers.
- Unauthorized users cannot access organization volunteer records.
- One organization cannot manage another organization's volunteers.
- Volunteer profile privacy rules are enforced.

### Location Tests
- Save valid geographic data.
- Reject invalid location data.
- Allow manual location selection when GPS permission is denied.
- Verify that no background tracking is implemented.

---

## 13. Out of Scope

Do not implement the following in Phase 03:

- Disaster task creation or management.
- Volunteer matching algorithms.
- Matching reports.
- Volunteer recommendations.
- Volunteer invitations.
- Organization-to-organization requests.
- SMS notifications.
- Email notifications.
- Automatic volunteer assignment.
- Background GPS tracking.

These features belong to later phases.

---

## 14. Expected Deliverables

At the end of Phase 03, deliver:

1. Volunteer profile screens.
2. Volunteer profile creation and editing.
3. Skills selection interface.
4. Disaster-type selection interface.
5. Location selection interface.
6. Organization profile screen.
7. Organization volunteer management screen.
8. Express API endpoints for profile management.
9. Database relationships for volunteer profiles, skills, and disaster types.
10. Clerk-based authorization.
11. Supabase RLS policies and tests.
12. Unit and integration tests.
13. Updated API and database documentation.

---

## 15. Implementation Order

Follow this order:

1. Review Phase 02 database and backend foundation.
2. Confirm the volunteer profile schema.
3. Confirm the approved skill catalogue and disaster types.
4. Implement profile-related database migrations.
5. Configure and test RLS policies.
6. Implement volunteer profile API endpoints.
7. Implement skills and disaster-type endpoints.
8. Implement organization volunteer management endpoints.
9. Build the volunteer profile screens.
10. Build the skills selection screen.
11. Build the location selection interface.
12. Build organization profile and volunteer management screens.
13. Connect screens to the backend.
14. Add validation and error handling.
15. Run tests and verify permissions.

---

## 16. Acceptance Criteria

Phase 03 is complete when:

- Volunteers can create and view their profiles.
- Volunteers can update their permitted profile information.
- Volunteers can select and update disaster-related skills.
- Volunteers can select supported disaster types.
- Volunteers can provide their location without requiring GPS permission.
- Volunteers can specify whether they have local-area knowledge.
- Authorized organization members can view their affiliated volunteers.
- Unauthorized organizations cannot access another organization's volunteer records.
- All application tables have appropriate RLS policies.
- Backend authentication and authorization are verified.
- Unit and integration tests pass.
- Phase 03 does not introduce task management, matching, invitations, or notifications.

---

## 17. Next Phase

After completing Phase 03, proceed to:

**Phase 04 — Disaster Task Management**

Phase 04 will introduce disaster task creation and management by authorized organizations.

VolunteerConnect's task lifecycle will remain:

`Open → Assigned → Ongoing → Completed`

Only the organization that owns a task can change its task status.

Do not start Phase 04 features during Phase 03 implementation.