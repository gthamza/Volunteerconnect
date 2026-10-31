Phase 01 — Authentication, Organizations, and App Shell
1. Phase Overview
The purpose of Phase 1 is to establish the foundation of VolunteerConnect.

This phase focuses on:
- Setting up the React Native application using Expo.
- Configuring TypeScript.
- Integrating Clerk authentication.
- Setting up Clerk Organizations.
- Configuring Supabase connectivity.
- Implementing protected navigation.
- Creating the initial application layout.
- Implementing NativeWind for styling.
- Supporting Light Mode, Dark Mode, and System Mode.
At the end of this phase, users should be able to register, log in, manage their organization workspace where applicable, and navigate through the basic application.

Important: This phase does not include disaster task creation, volunteer matching, or notification workflows.

2. Technology Stack
Use the following technologies:
Component	Technology
Mobile application	React Native
Framework	Expo
Language	TypeScript
Navigation	Expo Router
Authentication	Clerk
Organization management	Clerk Organizations
Database	Supabase PostgreSQL
Styling	NativeWind (Tailwind CSS)
Server state	TanStack Query
Form handling	React Hook Form
Validation	Zod
Secure session handling	Clerk
Testing	Jest + React Native Testing Library

Do not introduce alternative technologies without approval.

3. Application Setup
Create the React Native application using Expo and TypeScript.
Requirements
- Initialize the Expo project.
- Configure TypeScript.
- Configure Expo Router.
- Configure NativeWind.
- Create a clean folder structure.
- Configure environment variables.
- Set up reusable components.
- Prepare Android development configuration.
Expected result
The application should start successfully on an Android emulator or physical Android device.

4. NativeWind Styling Setup
NativeWind is the official styling system for VolunteerConnect.

Use Tailwind CSS utility classes through NativeWind.
Requirements
- Install and configure NativeWind compatible with the installed Expo SDK and React Native version.
- Use NativeWind v5 RC with Tailwind CSS v4 and CSS-first `@theme` configuration. See [NativeWind v5 project notes](../nativewind-v5.md).
- Configure Metro and Babel according to the installed NativeWind version.
- Configure the required global CSS entry file.
- Make NativeWind work with React Native components.
- Use className for supported components.
- Create reusable styling patterns.
- Configure colors, typography, spacing, and border-radius tokens.
- Support Light Mode and Dark Mode.
Example component
import { View, Text } from "react-native";

export default function WelcomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-gray-950">
      <Text className="text-2xl font-bold text-gray-900 dark:text-white">
        VolunteerConnect
      </Text>

      <Text className="mt-2 text-gray-600 dark:text-gray-300">
        Volunteer coordination for disaster relief.
      </Text>
    </View>
  );
}


Styling rules
- Use NativeWind for normal UI styling.
- Do not use traditional CSS for native screens.
- Do not use HTML elements.
- Do not assume browser-only Tailwind utilities work in React Native.
- Use reusable components instead of repeating styles.
- Keep styling consistent throughout the application.
- Use StyleSheet only when needed for native APIs, animations, or unsupported dynamic styles.

5. Clerk Authentication
Clerk is the authentication provider for VolunteerConnect.
Required features
- User registration.
- User login.
- Logout.
- Session management.
- Authentication state handling.
- Protected application routes.
Registration and login
Create authentication screens with:
- Email address.
- Password.
- Appropriate validation.
- Loading indicators.
- Error messages.
- Successful authentication handling.
Only enable authentication methods configured and approved for the project.
Important rules
- Use Clerk for authentication.
- Do not enable Supabase Auth as a second authentication system.
- Do not store authentication tokens in AsyncStorage.
- Use Clerk-supported session handling.
- Handle expired sessions properly.
- Keep authentication logic separate from UI components.

6. Clerk Organizations
Use Clerk Organizations to support registered relief organizations.

Organizations represent NGOs and public-sector relief organizations using VolunteerConnect.
Required features
- Organization representatives can create a Clerk organization workspace from the app.
- The creator becomes an organization administrator and can invite members from the app.
- Organization workspace support.
- Organization switching.
- Organization membership.
- Organization invitations.
- Organization context management.
User types
Independent volunteers
- Can use VolunteerConnect without joining an organization.
- Must not be forced into a Clerk Organization.
Organization-affiliated volunteers
- Belong to an organization.
- Are managed through their parent organization.
Organization administrators
- Manage their organization's workspace.
- Manage organization membership according to their permissions.
Important restrictions
- Do not automatically create an organization for every new user.
- Do not assume that creating a Clerk Organization proves an organization is officially registered.
- Do not implement automatic organization verification.
- Show newly created organization workspaces as unverified. Explain that a Clerk workspace does not confirm official registration.
- Organization verification and the evidence/review process remain out of scope until approved.

7. Supabase Integration
Supabase PostgreSQL will be the main application database.

In Phase 1, configure the connection without creating the final application database schema.
Requirements
- Install the Supabase JavaScript client.
- Configure environment variables.
- Create a reusable Supabase client.
- Configure the client to forward the appropriate Clerk JWT.
- Verify that the JWT is correctly received and recognized.
- Prepare the architecture for Row Level Security.
Security requirements
- Never expose the Supabase service-role key in the mobile application.
- Do not use Supabase Auth.
- Clerk remains the identity provider.
- Verify the actual JWT claims before designing RLS policies.
- Enable RLS on every application table when application tables are introduced.
Important
Do not create application tables during Phase 1.

The purpose is to establish secure connectivity and authentication integration.

8. Navigation and Protected Routes
Use Expo Router for navigation.

Create separate navigation areas for authenticated and unauthenticated users.
Unauthenticated routes
Examples:
- Login
- Registration
- Forgot password
Authenticated routes
Examples:
- Dashboard
- Profile
- Organization workspace
- Settings
Requirements
- Protect authenticated routes.
- Redirect signed-out users to authentication screens.
- Redirect authenticated users away from login and registration screens where appropriate.
- Do not mount protected screens while the user is signed out.
- Handle loading states while Clerk initializes.
- Preserve the user's organization context when navigating.
Do not implement full dashboard functionality in this phase.

9. Theme System
Implement three appearance modes:
1. Light Mode
2. Dark Mode
3. System Mode
Requirements
- Use NativeWind-compatible theme handling.
- Allow users to select their preferred appearance.
- Follow the device appearance when System Mode is selected.
- Persist the user's selected preference.
- Apply the selected theme throughout the application.
- Ensure text and background colors remain readable.
The theme should apply consistently to:
- Authentication screens.
- Dashboard shell.
- Navigation.
- Buttons.
- Inputs.
- Cards.
- Settings.

10. Initial Application Shell
Create the basic VolunteerConnect interface.

The application shell should contain:
- Application branding.
- Navigation structure.
- Dashboard placeholder.
- Profile section.
- Settings section.
- Organization workspace entry where applicable.
- Theme selection.
Design direction
The interface should look:
- Modern.
- Clean.
- Professional.
- Simple to understand.
- Suitable for disaster-relief coordination.
Use NativeWind for the interface.

Avoid unnecessary animations and complicated visual effects.

Do not implement actual disaster-management functionality yet.

11. Suggested Folder Structure
VolunteerConnect/
│
├── app/
│   ├── (auth)/
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── _layout.tsx
│   │
│   ├── (protected)/
│   │   ├── dashboard.tsx
│   │   ├── profile.tsx
│   │   ├── settings.tsx
│   │   └── _layout.tsx
│   │
│   └── _layout.tsx
│
├── components/
│   ├── ui/
│   ├── layout/
│   └── common/
│
├── features/
│   ├── authentication/
│   ├── organizations/
│   ├── theme/
│   └── dashboard/
│
├── hooks/
│
├── services/
│   ├── clerk/
│   └── supabase/
│
├── providers/
│
├── constants/
│
├── types/
│
├── utils/
│
├── assets/
│
├── global.css
├── postcss.config.mjs
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── package.json
└── AGENTS.md


Adjust configuration filenames and structure according to the installed NativeWind and Expo versions.

12. Environment Variables
Create an .env.example file.

Example:
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=

EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=


Never put secret keys in the mobile application's environment variables.

The Supabase service-role key must only be used in a trusted backend environment when required.

13. Testing Requirements
Test the following features before completing Phase 1.
Authentication
- User can register.
- User can log in.
- User can log out.
- Invalid credentials show appropriate errors.
- Expired sessions are handled properly.
Organizations
- User can create an organization workspace from inside the app.
- The creator can invite colleagues as an organization administrator.
- New workspaces are clearly identified as unverified.
- Organization workspace can be accessed by authorized members.
- Users can switch organizations.
- Organization invitations work.
- Independent volunteers can use the application without an organization.
- Organization membership is handled correctly.
Navigation
- Protected routes require authentication.
- Signed-out users cannot access protected screens.
- Authenticated users can access the application shell.
- Loading states work correctly.
Styling
- NativeWind classes render correctly.
- Light Mode works.
- Dark Mode works.
- System Mode follows device appearance.
- Theme preference persists.
- Screens work on different Android screen sizes.
Supabase
- Supabase client initializes correctly.
- Clerk JWT is forwarded correctly.
- No service-role key is exposed in the mobile app.
- Authentication integration is verified.

14. Phase 1 Acceptance Criteria
Phase 1 is complete when all the following conditions are satisfied.
- [ ] Expo application runs successfully.
- [ ] TypeScript is configured.
- [ ] Expo Router is configured.
- [ ] NativeWind is installed and working.
- [ ] Tailwind utility classes work with React Native components.
- [ ] Light Mode works.
- [ ] Dark Mode works.
- [ ] System Mode works.
- [ ] Clerk authentication is integrated.
- [ ] Registration works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Protected routes work.
- [ ] Clerk Organizations are integrated.
- [ ] Organization switching works.
- [ ] Organization invitations work.
- [ ] Independent volunteers are not forced into organizations.
- [ ] Supabase client is configured.
- [ ] Clerk JWT forwarding is verified.
- [ ] Initial application shell is implemented.
- [ ] Basic tests pass.
- [ ] Android development build works.

15. Out of Scope
The following features must not be implemented in Phase 1:
- Disaster task creation.
- Disaster task management.
- Volunteer matching.
- Matching reports.
- Volunteer invitations.
- Cross-organization requests.
- SMS notifications.
- Email notifications.
- Reminder scheduling.
- Volunteer assignment.
- Task status management.
- Maps and proximity matching.
- Python matching service implementation.
- Final application database schema.
These features belong to later development phases.

16. Development Instructions
Before starting implementation:
1. Read AGENTS.md.
2. Read this Phase 1 specification.
3. Inspect the existing project structure.
4. Check installed Expo and NativeWind versions.
5. Configure NativeWind according to the installed version.
6. Implement authentication.
7. Implement organization support.
8. Configure Supabase connectivity.
9. Implement protected navigation.
10. Implement the application shell.
11. Test all acceptance criteria.
Do not skip security requirements.

Do not start Phase 2 until Phase 1 acceptance criteria are satisfied.

Final goal: Deliver a working VolunteerConnect foundation with React Native, Expo, TypeScript, NativeWind, Clerk authentication, Clerk Organizations, Supabase connectivity, and protected application navigation.
