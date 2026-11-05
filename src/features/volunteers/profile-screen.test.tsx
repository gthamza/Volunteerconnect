import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import VolunteerProfileScreen from "../../app/(protected)/profile";

const mockUseVolunteerData = jest.fn();

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ getToken: jest.fn().mockResolvedValue("session-token") }),
  useOrganization: () => ({ organization: null }),
  useUser: () => ({ user: { firstName: "Amina", lastName: "Khan", primaryEmailAddress: { emailAddress: "amina@example.org" } } }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ replace: jest.fn(), push: jest.fn(), back: jest.fn() }) }));
jest.mock("./queries", () => ({ useVolunteerData: () => mockUseVolunteerData() }));

async function renderProfile() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } } })}>
      <VolunteerProfileScreen />
    </QueryClientProvider>,
  );
}

describe("Volunteer Profile screen", () => {
  beforeEach(() => mockUseVolunteerData.mockReset());

  it("shows the volunteer's returned profile and permitted Clerk contact details", async () => {
    mockUseVolunteerData.mockReturnValue({
      profile: {
        data: {
          id: "profile-id",
          localAreaKnowledge: true,
          createdAt: "2026-11-03T00:00:00Z",
          updatedAt: "2026-11-03T00:00:00Z",
          skills: [{ id: "skill-id", name: "First Aid" }],
          disasterTypes: [{ id: "flood-id", name: "Flood" }],
        },
        isLoading: false,
        isError: false,
        isSuccess: true,
      },
    });

    const view = await renderProfile();

    expect(view.getByText("Amina Khan")).toBeTruthy();
    expect(view.getByText("amina@example.org")).toBeTruthy();
    expect(view.getByText("First Aid")).toBeTruthy();
    expect(view.getByText("Flood")).toBeTruthy();
    expect(view.getByText("Yes")).toBeTruthy();
    expect(view.getByText("No location selected.")).toBeTruthy();
    expect(view.getByText(/Clerk organization membership determines your current organization affiliation/)).toBeTruthy();
  });

  it("shows a loading state while the profile request is pending", async () => {
    mockUseVolunteerData.mockReturnValue({ profile: { data: undefined, isLoading: true, isError: false } });
    const view = await renderProfile();
    expect(view.getByLabelText("Loading volunteer profile")).toBeTruthy();
  });

  it("offers profile creation when the API reports no profile", async () => {
    const error = Object.assign(new Error("A volunteer profile has not been created."), { status: 404 });
    mockUseVolunteerData.mockReturnValue({ profile: { data: undefined, isLoading: false, isError: true, error } });
    const view = await renderProfile();
    expect(view.getByText("Create volunteer profile")).toBeTruthy();
  });
});
