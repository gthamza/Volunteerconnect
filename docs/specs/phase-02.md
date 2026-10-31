Phase 02 — Database Design & Backend Foundation
Project: VolunteerConnect
Phase: 02 of 08
Status: Planned
Depends on: Phase 01 — Authentication, Organizations & App Shell

1. Phase Objective
The objective of Phase 2 is to build the database and backend foundation for VolunteerConnect.

By the end of this phase, you should have:
- A complete database design.
- An Entity Relationship Diagram (ERD).
- Supabase PostgreSQL configured.
- PostGIS enabled for geographical data.
- Database tables and relationships created.
- SQL migrations organized and version-controlled.
- Row Level Security (RLS) enabled.
- Clerk authentication integrated with the backend.
- An Express.js + TypeScript backend established.
- Basic database and API tests completed.
Important: This phase focuses on database and backend development. You will not build volunteer profiles, disaster task management, matching, invitations, or notifications yet. Those features belong to later phases.
2. Technology Stack
Use the technologies already selected for VolunteerConnect.
Area	Technology
Mobile Application	React Native + Expo
Programming Language	TypeScript
Navigation	Expo Router
Authentication	Clerk
Organization Management	Clerk Organizations
Database	Supabase PostgreSQL
Geographical Data	PostGIS
Backend	Node.js + Express.js
Matching Service	Python
UI Styling	NativeWind
API State Management	TanStack Query
Client State Management	Zustand (if needed)
Form Handling	React Hook Form
Validation	Zod
Maps	OpenStreetMap-compatible data
Testing	Jest + React Native Testing Library
Android E2E Testing	Maestro

Do not introduce Supabase Auth as another authentication system. Clerk remains the only authentication provider.
3. Important Project Rules
The database and backend must follow these rules:
1. Only registered and authorized organizations can create, edit, and manage disaster tasks.
2. Disaster categories are limited to Flood and Earthquake.
3. Volunteer matching uses exactly three criteria:
   - Disaster-related skills.
   - Proximity to the affected location.
   - Local-area knowledge (Yes/No).
4. Matching generates recommendations only. It must not automatically assign volunteers.
5. Exactly one matching report must be generated per task.
6. Matching must not be repeated after volunteers respond.
7. Do not add a Search Again or fallback-volunteer workflow.
8. Volunteers must accept or decline invitations inside the application.
9. Only the organization that owns a task can change its status.
10. Task status follows this lifecycle:
Open → Assigned → Ongoing → Completed
11. Invitation status must remain separate from task status.
12. SMS and email are notification channels only. Responses must be recorded inside the application.
13. Cross-organization requests are accepted or declined by the receiving organization as a complete group.
14. Independent volunteers cannot create or manage disaster tasks.
15. Do not implement continuous or background location tracking.
16. If GPS permission is denied, volunteers must still be able to provide their location manually or through a map.
17. Enable RLS on every application table.
18. Never expose the Supabase service-role key in the mobile application.
19. Verify actual Clerk JWT claims before creating RLS policies.
20. Enforce authorization in both the backend and database.
4. Database Design
4.1 Create the Entity Relationship Diagram (ERD)
Before creating database tables, prepare an ERD showing:
- All database entities.
- Primary keys.
- Foreign keys.
- Relationships.
- One-to-one relationships.
- One-to-many relationships.
- Many-to-many relationships.
Use Eraser.io to create the database diagram.

The ERD must match the actual SQL database structure.
4.2 Proposed Database Tables
The following tables are proposed for VolunteerConnect.
No.	Table Name	Purpose
1	app_users	Stores application user information linked to Clerk.
2	organizations	Stores organization information.
3	volunteer_profiles	Stores volunteer profile information.
4	disaster_types	Stores disaster categories: Flood and Earthquake.
5	skills	Stores disaster-related volunteer skills.
6	volunteer_disaster_types	Connects volunteers with disaster types.
7	volunteer_skills	Connects volunteers with their skills.
8	disaster_tasks	Stores disaster tasks created by organizations.
9	task_required_skills	Stores skills required for each task.
10	matching_reports	Stores the matching report generated for a task.
11	matching_recommendations	Stores recommended volunteers.
12	volunteer_invitations	Stores volunteer invitations and responses.
13	organization_requests	Stores cross-organization requests.
14	organization_request_members	Stores members included in organization requests.
15	notification_records	Stores notification information.
16	audit_events	Records important system activities.

These are proposed entities. Final columns, constraints, and relationships must be confirmed during database design.
4.3 Database Relationships
Design the relationships according to the application requirements:
- One application user is linked to a Clerk user identity.
- An organization is linked to a Clerk Organization.
- A volunteer profile belongs to an application user.
- A volunteer can have multiple skills.
- A skill can belong to multiple volunteers.
- An organization can create multiple disaster tasks.
- Each disaster task belongs to one organization.
- A task can require multiple skills.
- Each task has one matching report.
- A matching report can contain multiple volunteer recommendations.
- Recommendations can lead to volunteer invitations.
- An organization request belongs to a receiving organization.
- An organization request can contain multiple members.
- Notification records store notification attempts and channels.
- Audit events record important system activities.
Choose deletion rules carefully. Important task history and audit records should not be accidentally deleted through cascading operations.
4.4 Task Status Design
The task status must support the following lifecycle:
- Open
- Assigned
- Ongoing
- Completed
Invitation response status must be stored separately.

Do not automatically change task status simply because a volunteer accepts or declines an invitation. Only the task-owning organization controls task status.

The exact invitation response states and expiry rules still need approval.
5. Geographical Database Setup
VolunteerConnect needs geographical information to support volunteer matching.

Use PostGIS, an extension for PostgreSQL.

Requirements:
- Store volunteer locations.
- Store disaster task locations.
- Use an appropriate geographical data type, such as geography(Point, 4326).
- Create spatial indexes.
- Validate latitude and longitude values.
- Use a consistent coordinate format throughout the backend and mobile application.
- Support manual location selection if GPS permission is denied.
- Do not implement background location tracking.
Do not decide the matching radius or distance threshold in this phase. These remain project decisions.
6. Supabase Database Setup
Step 1: Create a Supabase Project
1. Open Supabase.
2. Sign in to your account.
3. Create a new project.
4. Enter your project name.
5. Set a strong database password.
6. Select the appropriate region.
7. Wait for the database to initialize.
Step 2: Enable PostGIS
1. Open your Supabase project.
2. Navigate to Database Extensions.
3. Find PostGIS.
4. Enable the extension.
5. Verify that it is available in PostgreSQL.
Step 3: Create Database Migrations
Organize SQL migrations in your project.

Example structure:
supabase/
    migrations/
        0001_enable_extensions.sql
        0002_create_core_tables.sql
        0003_create_relationships.sql
        0004_create_indexes.sql
        0005_enable_rls.sql
        0006_create_policies.sql


Each migration should represent a specific database change.

Do not make undocumented manual changes to the database.
Step 4: Create Database Tables
Create the approved tables using SQL migrations.

For each table, define:
- Primary key.
- Foreign keys.
- Required columns.
- Data types.
- Default values.
- Unique constraints.
- Check constraints.
- Relationships.
Step 5: Create Indexes
Create indexes for frequently queried columns.

Examples include:
- User identity.
- Organization ID.
- Volunteer ID.
- Task ID.
- Invitation ID.
- Foreign keys.
- Geographical locations.
Use spatial indexes for geographical columns.
7. Clerk Authentication and RLS Security
7.1 Authentication Architecture
Clerk handles authentication.

The expected process is:
1. A user signs in through Clerk.
2. The mobile application receives a Clerk session token.
3. The mobile application sends the token to the Express backend.
4. The backend verifies the token.
5. The backend identifies the authenticated user.
6. The backend performs authorized operations.
Never trust user IDs, organization IDs, or roles simply because they were submitted by the mobile application.
7.2 Row Level Security (RLS)
Enable RLS on every application table.

RLS controls which records users and organizations can access.

Before writing policies:
1. Inspect the actual Clerk JWT claims.
2. Confirm how user identity is represented.
3. Confirm how organization context is represented.
4. Establish how verified claims will be used for database authorization.
5. Test policies with real representative tokens.
Do not guess JWT claim names or create policies based on assumptions.
7.3 RLS Permission Requirements
Prepare a permission matrix covering:
Table	Security Requirement
app_users	Users should access only their permitted records.
organizations	Organization access must follow verified membership and permissions.
volunteer_profiles	Profile information must be protected.
skills	Reference data should have controlled maintenance permissions.
disaster_tasks	Only the owning organization can manage its tasks.
matching_reports	Only authorized users can access matching results.
matching_recommendations	Volunteers should access only their relevant information.
volunteer_invitations	Volunteers can respond only to their own invitations.
organization_requests	Only authorized receiving-organization members can respond.
notification_records	Users can access only their own notification records.
audit_events	Ordinary clients must not be able to modify audit records.

These are requirements to implement and test. Final policies depend on the verified Clerk claims and authorization design.
7.4 Protect Secret Keys
Important security rules:
- Never put the Supabase service-role key in React Native.
- Keep privileged Supabase credentials on the backend only.
- Never commit secret keys to GitHub.
- Use environment variables.
- Keep development and production secrets separate.
- Never log passwords, tokens, or sensitive personal information.
8. Backend Development with Express.js
Create the backend using Node.js, Express.js, and TypeScript.
8.1 Suggested Backend Structure
backend/
    src/
        config/
        middleware/
        routes/
        controllers/
        services/
        repositories/
        validators/
        types/
        app.ts
        server.ts

    tests/
    package.json
    tsconfig.json
    .env.example


This structure can be adjusted to match the existing repository.
8.2 Backend Requirements
Implement the following foundation:
1. Express application setup.
2. TypeScript configuration.
3. Environment-variable validation.
4. Clerk authentication middleware.
5. Supabase server-side client.
6. Error-handling middleware.
7. Request parsing and size limits.
8. Basic request logging without sensitive information.
9. CORS configuration.
10. Health-check endpoint.
8.3 Health Check API
Create:
GET /health


This endpoint checks whether the backend server is running.

It should return a simple response indicating the backend's health.

Do not implement the future profile, task, matching, invitation, or notification APIs in this phase.
9. Environment Variables
Create a backend .env file for development.

Example:
NODE_ENV=development
PORT=3000

CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key

SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key


Create an .env.example containing placeholder values.

Important:
- The backend uses the service-role key only when necessary.
- The mobile application must never receive this key.
- Keep backend and mobile environment variables separate.
- Never upload actual .env secrets to GitHub.
10. Testing
Testing is an important part of Phase 2.
10.1 Database Testing
Test the following:
- All migrations execute successfully.
- All tables are created.
- Primary keys work correctly.
- Foreign keys work correctly.
- Unique constraints prevent duplicate records where required.
- Invalid task statuses are rejected.
- Invalid disaster categories are rejected.
- Invalid geographical coordinates are rejected.
- Spatial indexes exist.
- RLS is enabled on all application tables.
- Unauthorized users cannot access protected records.
- Organizations cannot manage tasks owned by other organizations.
- A task cannot have multiple matching reports.
10.2 Backend Testing
Test:
- Backend starts successfully.
- Health endpoint works.
- Requests without authentication are rejected on protected routes.
- Invalid Clerk tokens are rejected.
- Expired tokens are rejected.
- Valid Clerk tokens are accepted.
- Client-submitted user IDs cannot override verified identity.
- Error handling works correctly.
- Secret keys are not exposed in API responses or logs.
10.3 Integration Testing
Test the complete connection:
React Native Application
          |
          v
      Express API
          |
          v
   Clerk Verification
          |
          v
  Supabase Server Client
          |
          v
   PostgreSQL Database


Use test accounts and test organizations. Do not use real volunteer personal information in test data.
11. Documentation
At the end of Phase 2, prepare the following documentation:
1. Database ERD.
2. Database table descriptions.
3. Data dictionary.
4. Database relationship documentation.
5. RLS permission matrix.
6. Supabase setup guide.
7. Backend setup guide.
8. Environment-variable guide.
9. API foundation documentation.
10. Database testing report.
11. Backend testing report.
12. Unresolved project decisions.
Keep the documents inside the project's docs directory, following the existing repository structure.
12. Decisions That Must Remain Unresolved
Do not invent answers for these requirements:
1. How organizations will be verified.
2. How volunteer onboarding and organization-affiliated accounts will work.
3. Which disaster-related skills will be available.
4. Who can manage the skills catalogue.
5. Matching radius and distance threshold.
6. Matching scoring, ranking, and tie-breaking.
7. How volunteer locations will be collected and updated.
8. When an invitation expires.
9. What happens when a volunteer does not respond.
10. How simultaneous invitations will be handled.
11. Which SMS and email providers will be used.
12. How CNIC images will be stored and protected.
13. How long personal data will be retained.
14. How account and data deletion will work.
15. Production deployment and hosting costs.
Record these decisions and obtain approval before implementing features that depend on them.
13. Out of Scope
Do not develop these features in Phase 2:
- Volunteer registration screens.
- Volunteer profile management.
- Volunteer skill selection.
- Organization volunteer management.
- Disaster task creation and management.
- Matching algorithm.
- Volunteer recommendation screens.
- Volunteer invitations.
- Cross-organization request workflow.
- SMS and email delivery.
- Push notifications.
- Background location tracking.
- Production deployment unless separately approved.
These features belong to later phases.
14. Step-by-Step Development Workflow
Follow this order:
1. Review Phase 1 and confirm authentication is working.
2. Review the existing project folder structure.
3. Confirm the backend and mobile environment configuration.
4. Design the database ERD.
5. Prepare the database data dictionary.
6. Review all proposed tables and relationships.
7. Identify unresolved decisions that affect the schema.
8. Create the Supabase project.
9. Enable PostGIS.
10. Create SQL migration files.
11. Create the approved database tables.
12. Add foreign keys and constraints.
13. Add required indexes.
14. Prepare the RLS permission matrix.
15. Verify Clerk JWT claims.
16. Implement secure RLS policies.
17. Create the Express backend.
18. Configure TypeScript.
19. Integrate Clerk token verification.
20. Connect the backend to Supabase.
21. Create the health-check endpoint.
22. Implement basic middleware and error handling.
23. Write database tests.
24. Write backend tests.
25. Run integration tests.
26. Complete the documentation.
27. Review all acceptance criteria.
28. Get approval before starting Phase 3.
15. Phase 2 Acceptance Criteria
Phase 2 will be considered complete when:
- [ ] Phase 1 authentication continues to work.
- [ ] Database ERD is completed and reviewed.
- [ ] Database data dictionary is completed.
- [ ] All approved database tables are created.
- [ ] Database relationships are correctly implemented.
- [ ] Supabase PostgreSQL is configured.
- [ ] PostGIS is enabled.
- [ ] SQL migrations are organized and version-controlled.
- [ ] All migrations run successfully on a clean development database.
- [ ] Primary keys, foreign keys, and constraints are tested.
- [ ] Geographical columns and spatial indexes are implemented where approved.
- [ ] RLS is enabled on all application tables.
- [ ] Actual Clerk JWT claims are verified.
- [ ] RLS policies are implemented and tested.
- [ ] Unauthorized access is blocked.
- [ ] Express + TypeScript backend is running.
- [ ] Health-check endpoint works.
- [ ] Clerk authentication middleware works.
- [ ] Backend connects to Supabase successfully.
- [ ] Service-role key is protected.
- [ ] Environment variables are documented.
- [ ] Database tests pass.
- [ ] Backend tests pass.
- [ ] Integration tests pass.
- [ ] Unresolved decisions are documented.
- [ ] No out-of-scope features from later phases have been implemented.
16. Roadmap After Phase 2
After Phase 2 is completed and approved, continue with the existing project roadmap:
Phase	Name
Phase 01	Authentication, Organizations & App Shell
Phase 02	Database Design & Backend Foundation
Phase 03	User Profiles & Volunteer Management
Phase 04	Disaster Task Management
Phase 05	Volunteer Matching System
Phase 06	Invitations & Organization Requests
Phase 07	Notification System
Phase 08	Testing, Security & Deployment

Important: Do not start Phase 3 until Phase 2 has been completed, tested, and approved.

End of Phase 02 — Database Design & Backend Foundation