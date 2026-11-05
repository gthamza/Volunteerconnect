import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import EditVolunteerProfileScreen from "../../app/(protected)/edit-profile";

const mockUseVolunteerData = jest.fn();
const mockRouter = { back: jest.fn(), replace: jest.fn() };
const mockUpdateLocalKnowledge = jest.fn();
const mockAddSkills = jest.fn();
const mockRemoveSkill = jest.fn();
const mockAddDisasterTypes = jest.fn();
const mockRemoveDisasterType = jest.fn();

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ getToken: jest.fn().mockResolvedValue("session-token") }),
}));
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("./queries", () => ({
  useVolunteerData: () => mockUseVolunteerData(),
  volunteerProfileKey: ["volunteer-profile"],
  skillCatalogueKey: ["volunteer-skill-catalogue"],
  disasterTypesKey: ["volunteer-disaster-types"],
}));
jest.mock("./api", () => ({
  updateLocalKnowledge: (...args: unknown[]) => mockUpdateLocalKnowledge(...args),
  addSkills: (...args: unknown[]) => mockAddSkills(...args),
  removeSkill: (...args: unknown[]) => mockRemoveSkill(...args),
  addDisasterTypes: (...args: unknown[]) => mockAddDisasterTypes(...args),
  removeDisasterType: (...args: unknown[]) => mockRemoveDisasterType(...args),
}));

const profile = {
  id: "profile-id",
  localAreaKnowledge: null,
  createdAt: "2026-11-03T00:00:00Z",
  updatedAt: "2026-11-03T00:00:00Z",
  skills: [],
  disasterTypes: [],
};
const SKILL_ID = "20000000-0000-4000-8000-000000000001";
const FLOOD_ID = "30000000-0000-4000-8000-000000000001";

async function renderEditProfile() {
  return await render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } } })}>
      <EditVolunteerProfileScreen />
    </QueryClientProvider>,
  );
}

describe("Edit Volunteer Profile screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVolunteerData.mockReturnValue({
      profile: { data: profile, isLoading: false, isError: false },
      skills: { data: [{ id: SKILL_ID, name: "First Aid" }], isLoading: false, isError: false },
      disasters: { data: [{ id: FLOOD_ID, name: "Flood" }], isLoading: false, isError: false },
    });
    mockUpdateLocalKnowledge.mockResolvedValue(profile);
  });

  it("loads the existing approved catalogues and presents editable choices", async () => {
    const view = await renderEditProfile();

    expect(await view.findByText("First Aid")).toBeTruthy();
    expect(view.getByText("Flood")).toBeTruthy();
    expect(view.getByRole("radio", { name: "Yes" })).toBeTruthy();
    expect(view.getByRole("radio", { name: "No" })).toBeTruthy();
  });

  it("requires a local-area knowledge answer before saving", async () => {
    const view = await renderEditProfile();
    fireEvent.press(view.getByText("Save changes"));

    expect(await view.findByText("Please choose Yes or No.")).toBeTruthy();
    expect(mockUpdateLocalKnowledge).not.toHaveBeenCalled();
  });

  it("saves permitted profile changes and returns to the profile", async () => {
    const view = await renderEditProfile();
    await waitFor(() => expect(view.getByRole("radio", { name: "Yes" })).toBeTruthy());
    await fireEvent.press(view.getByRole("radio", { name: "Yes" }));
    await fireEvent.press(view.getByRole("checkbox", { name: "First Aid" }));
    await fireEvent.press(view.getByRole("checkbox", { name: "Flood" }));
    await fireEvent.press(view.getByText("Save changes"));

    await waitFor(() => expect(mockUpdateLocalKnowledge).toHaveBeenCalledWith("session-token", true));
    expect(mockAddSkills).toHaveBeenCalledWith("session-token", [SKILL_ID]);
    expect(mockAddDisasterTypes).toHaveBeenCalledWith("session-token", [FLOOD_ID]);
    expect(mockRouter.replace).toHaveBeenCalledWith("/profile");
  });

  it("shows an empty state when the approved skills catalogue has no entries", async () => {
    mockUseVolunteerData.mockReturnValue({
      profile: { data: profile, isLoading: false, isError: false },
      skills: { data: [], isLoading: false, isError: false },
      disasters: { data: [], isLoading: false, isError: false },
    });
    const view = await renderEditProfile();

    expect(await view.findByText(/No skills are currently available in the API catalogue/)).toBeTruthy();
    expect(await view.findByText(/No disaster types are currently available in the API catalogue/)).toBeTruthy();
  });
});
