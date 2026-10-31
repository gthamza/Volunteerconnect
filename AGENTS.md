1. Project Overview
VolunteerConnect is a volunteer coordination system designed for disaster-relief operations in Pakistan.

The application helps registered relief organizations coordinate volunteers during:
- Flood disasters
- Earthquake disasters
The system supports three types of users:
1. Registered Organizations: NGOs and public-sector relief organizations that create and manage disaster tasks.
2. Independent Volunteers: Individuals who register and volunteer independently.
3. Organization-Affiliated Volunteers: Volunteers who belong to a registered organization and are managed by that organization.
The main goal is to make disaster-relief coordination organized, transparent, and efficient.
2. Main Project Rules
Follow these rules throughout development:
1. Only registered organizations can create, edit, and manage disaster tasks.
2. Disaster types are limited to Flood and Earthquake.
3. Volunteer matching must use exactly three criteria:
   - Disaster-related skills
   - Proximity to the affected location
   - Local-area knowledge (Yes/No)
4. Generate only one matching report per task.
5. Do not rerun matching when volunteers accept or decline invitations.
6. A matching result is only a recommendation, not an automatic assignment.
7. Volunteers must explicitly accept or decline invitations.
8. Only the organization that created a task can change its status.
9. SMS and email are notification channels only. Actual responses must be recorded inside the application.
10. Do not implement automatic volunteer assignment.
11. Do not add a Search Again feature or automatic fallback-volunteer flow.
12. Cross-organization requests must be accepted or declined as a complete group by the receiving organization.
13. Do not introduce new product rules without approval.
3. Technology Stack
Use the following technologies for this project.
Area	Technology
Mobile application	React Native
Development framework	Expo
Programming language	TypeScript
Navigation	Expo Router
Authentication	Clerk
Organization management	Clerk Organizations
Database	Supabase PostgreSQL
Geospatial queries	PostGIS
Backend	Node.js + Express
Matching service	Python
Styling	NativeWind (Tailwind CSS for React Native)
Server state	TanStack Query
Local state	Zustand (only when needed)
Forms	React Hook Form
Validation	Zod
Maps	OpenStreetMap-compatible data
Testing	Jest + React Native Testing Library
Android E2E testing	Maestro

Do not change the technology stack without approval.
4. Styling Rules — NativeWind / Tailwind CSS
NativeWind is the official styling solution for VolunteerConnect.

Use NativeWind to write Tailwind-style utility classes in React Native components.
Required styling practices
- Use className for styling supported React Native components.
- Use Tailwind utility classes for layouts, spacing, colors, typography, borders, shadows, and rounded corners.
- Keep styling consistent throughout the application.
- Use reusable components instead of repeating large class strings.
- Define reusable design tokens in the NativeWind/Tailwind configuration.
- Support Light Mode, Dark Mode, and System Mode.
- Use NativeWind's supported dark-mode configuration.
- Make sure all utility classes are compatible with the installed NativeWind version.
- Keep components responsive across different Android screen sizes.
- Maintain accessible text contrast and appropriate touch-target sizes.
Example
import { View, Text } from "react-native";

export default function WelcomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white">
        Welcome to VolunteerConnect
      </Text>

      <Text className="mt-2 text-base text-gray-600 dark:text-gray-300">
        Coordinate volunteers during disasters.
      </Text>
    </View>
  );
}


Important styling restrictions
- Do not use traditional CSS files for native screens.
- Do not use HTML elements such as div, span, or button.
- Do not assume browser-only Tailwind utilities work in React Native.
- Do not introduce another styling framework without approval.
- Avoid using StyleSheet for ordinary styling when NativeWind can handle it.
- StyleSheet is allowed when required by native APIs, animations, dynamic measurements, or third-party libraries.
- Do not assume Clerk components support className. Use their documented appearance or theme configuration.
NativeWind configuration
Configure NativeWind according to the installed versions of:
- Expo
- React Native
- NativeWind
- Tailwind CSS
Do not copy setup instructions from a different NativeWind major version.

Verify the configuration by running the app on an Android development build.
5. Authentication Rules — Clerk
Clerk is responsible for authentication and user sessions.

Use Clerk for:
- User registration
- User login
- Session management
- Organization workspaces
- Organization membership
- Organization invitations
- Organization switching
Important rules
- Independent volunteers must be able to use the application without joining an organization.
- Do not automatically create an organization for every new user.
- Organization creation and verification must follow the approved project workflow.
- Do not use Supabase Auth as a second authentication system.
- Do not store authentication tokens in AsyncStorage.
- Use Clerk-supported session handling.
6. Database Rules — Supabase
Use Supabase PostgreSQL as the main database.

Use PostGIS for geographical queries and volunteer proximity calculations.
Security rules
- Enable Row Level Security (RLS) on every application table.
- Never expose the Supabase service-role key in the mobile application.
- Configure the Supabase client to forward the appropriate Clerk JWT.
- Verify actual JWT claims before creating RLS policies.
- Enforce authorization in both the backend and database.
- Never trust organization IDs or user IDs supplied by the mobile application without server-side verification.
Clerk manages identity. Supabase stores application data.

Do not enable Supabase Auth as a competing authentication provider.
7. Backend Rules
Use Node.js and Express for backend APIs.

The backend must:
- Verify Clerk authentication tokens.
- Validate incoming requests.
- Check user permissions.
- Verify organization membership.
- Enforce task ownership.
- Protect sensitive information.
- Keep API credentials and secrets on the server.
- Communicate securely with Supabase.
- Communicate with the Python matching service.
Only authorized organizations can create and manage tasks.
8. Volunteer Matching Rules
The matching service will be developed using Python.

Matching must use exactly these three criteria:
1. Disaster-related skills
2. Proximity to the affected location
3. Local-area knowledge (Yes/No)
Matching restrictions
- Do not introduce additional matching criteria.
- Do not use generative AI to make volunteer-selection decisions.
- Do not automatically assign volunteers.
- Generate one matching report per task.
- Do not regenerate the report when responses arrive.
- Keep matching results explainable.
The following decisions are still pending and must not be invented:
- Distance threshold
- Skill catalogue
- Multiple-skill matching rules
- Matching score and weighting
- Ranking and tie-breaking rules
9. Task Management
Only registered organizations can create tasks.

Each task must belong to the organization that created it.

Use this exact task lifecycle:

Open → Assigned → Ongoing → Completed

Only the task-creating organization can change the task status.

Do not allow volunteers or other organizations to change task status.

Invitation statuses and task statuses must remain separate.
10. Invitation and Notification Rules
Independent volunteers
- Send invitations through SMS.
- Volunteers open the application.
- Volunteers accept or decline inside the application.
- Store the response in Supabase.
Cross-organization requests
- Send requests through email and SMS.
- The receiving organization opens the application.
- The receiving organization accepts or declines the complete requested group.
- Store the response in the application.
Reminder system
- If a request remains Pending after 20 minutes, send one reminder through SMS and email.
- If it remains unanswered after the reminder period, mark it as No Response.
- The exact final waiting period is not yet decided. Do not invent a cutoff.
Notification restrictions
- Email and SMS are notification channels only.
- Do not accept responses directly through SMS or email.
- Prevent duplicate notifications.
- Keep notification provider credentials on the backend.
11. Mobile Application Rules
Use React Native with Expo.

Use Expo Router for navigation.

The application must:
- Have separate authenticated and unauthenticated navigation.
- Protect screens that require authentication.
- Support Light Mode.
- Support Dark Mode.
- Support System Mode.
- Provide loading indicators.
- Provide clear error messages.
- Provide empty states.
- Use reusable UI components.
- Maintain consistent NativeWind styling.
Use expo-location only when location access is needed.

Do not implement continuous or background volunteer tracking.

If GPS permission is denied, provide a manual or map-based location option.
12. Code Quality Rules
Write clean, maintainable, and reusable code.

Follow these practices:
- Use TypeScript types and interfaces.
- Avoid unnecessary any types.
- Use reusable components.
- Keep business logic separate from UI components.
- Keep API calls separate from screens.
- Validate user input.
- Handle errors properly.
- Use meaningful variable and function names.
- Avoid duplicated code.
- Keep files organized.
- Add comments where logic is not obvious.
Do not put the entire application inside one file.
13. Suggested Project Structure
VolunteerConnect/
│
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   │
│   ├── (tabs)/
│   │   ├── index.tsx
│   │   ├── tasks.tsx
│   │   ├── invitations.tsx
│   │   └── profile.tsx
│   │
│   ├── organization/
│   ├── volunteer/
│   ├── tasks/
│   └── _layout.tsx
│
├── components/
│   ├── ui/
│   ├── forms/
│   ├── layout/
│   └── common/
│
├── features/
│   ├── authentication/
│   ├── organizations/
│   ├── volunteers/
│   ├── tasks/
│   ├── matching/
│   └── notifications/
│
├── hooks/
│
├── services/
│   ├── api/
│   ├── supabase/
│   └── notifications/
│
├── store/
│
├── types/
│
├── constants/
│
├── utils/
│
├── assets/
│
├── docs/
│   └── phases/
│
├── backend/
│
├── matching-service/
│
├── global.css
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── package.json
└── AGENTS.md


Note: NativeWind configuration filenames and setup may differ by version. Keep the actual project configuration consistent with the installed NativeWind version.
14. Privacy and Security
- Collect only information required for volunteer coordination.
- Protect volunteer contact details.
- Do not expose personal information to unauthorized organizations.
- Do not implement continuous location tracking.
- Request location permission only when necessary.
- Keep secrets out of source code.
- Use environment variables for backend credentials.
- Apply database RLS policies.
- Enforce authorization on protected operations.
CNIC handling, data-retention periods, and detailed privacy policies require explicit product decisions before implementation.
15. Testing Requirements
Test the following areas:
- Registration and login
- Logout and session handling
- Organization switching
- Organization membership and invitations
- Independent volunteer access
- Task creation and management permissions
- Volunteer matching criteria
- Matching report generation
- Volunteer acceptance and decline
- Cross-organization group approval
- SMS and email notifications
- Reminder behavior
- Task lifecycle permissions
- Light and Dark themes
- Protected navigation
- Database access restrictions
Use Jest and React Native Testing Library for unit and component tests.

Use Maestro for Android end-to-end testing.
16. Decisions That Must Be Confirmed
Do not silently make decisions about:
- Organization registration and verification
- Independent volunteer onboarding
- Organization-affiliated volunteer account management
- Matching distance threshold
- Skill catalogue
- Matching score and ranking
- Location source (GPS or manual)
- No Response cutoff after reminder
- Multiple simultaneous task invitations
- SMS and email providers
- Data retention and CNIC privacy
- Production deployment and provider costs
Ask for clarification when any of these decisions are necessary to complete a feature.
17. Development Workflow
Before implementing a feature:
1. Read this AGENTS.md.
2. Read the relevant phase specification in docs/phases/.
3. Understand the existing project structure.
4. Follow the established technology stack.
5. Implement the feature using reusable components.
6. Use NativeWind for native UI styling.
7. Add validation and error handling.
8. Check authentication and authorization.
9. Test the feature.
10. Update relevant documentation.
Do not implement future phases while working on the current phase unless explicitly requested.
18. Final Development Principle
VolunteerConnect must prioritize:
- Transparency
- Security
- Privacy
- Clear responsibility
- Volunteer consent
- Organization accountability
- Reliable disaster-relief coordination
Most important rule: Matching is not assignment, an invitation is not consent, and only the task-owning organization controls its task.