import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import SkillsSelectionScreen from "../../app/(protected)/skills";

const mockUseVolunteerData = jest.fn();
const mockAddSkills = jest.fn();
const mockRemoveSkill = jest.fn();
const mockAddDisasterTypes = jest.fn();
const mockRemoveDisasterType = jest.fn();
const mockRouter = { back: jest.fn() };

jest.mock("@clerk/expo", () => ({ useAuth: () => ({ getToken: jest.fn().mockResolvedValue("session-token") }) }));
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("../../features/volunteers/queries", () => ({
  useVolunteerData: () => mockUseVolunteerData(),
  volunteerProfileKey: ["volunteer-profile"],
  skillCatalogueKey: ["volunteer-skill-catalogue"],
  disasterTypesKey: ["volunteer-disaster-types"],
}));
jest.mock("../../features/volunteers/api", () => ({
  addSkills: (...args: unknown[]) => mockAddSkills(...args),
  removeSkill: (...args: unknown[]) => mockRemoveSkill(...args),
  addDisasterTypes: (...args: unknown[]) => mockAddDisasterTypes(...args),
  removeDisasterType: (...args: unknown[]) => mockRemoveDisasterType(...args),
}));

const profile = {
  id: "10000000-0000-4000-8000-000000000001", localAreaKnowledge: null, createdAt: "2026-11-03T00:00:00Z", updatedAt: "2026-11-03T00:00:00Z",
  skills: [{ id: "20000000-0000-4000-8000-000000000001", name: "Existing skill" }],
  disasterTypes: [{ id: "30000000-0000-4000-8000-000000000001", name: "Flood" }],
};
const skillCatalogue = [{ id: "20000000-0000-4000-8000-000000000001", name: "Existing skill" }, { id: "20000000-0000-4000-8000-000000000002", name: "New skill" }];
const disasterCatalogue = [{ id: "30000000-0000-4000-8000-000000000001", name: "Flood" }, { id: "30000000-0000-4000-8000-000000000002", name: "Earthquake" }];

async function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { gcTime: 0, retry: false } } });
  return await render(<QueryClientProvider client={queryClient}><SkillsSelectionScreen /></QueryClientProvider>);
}

describe("Skills selection screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseVolunteerData.mockReturnValue({
      profile: { data: profile, isLoading: false, isError: false, refetch: jest.fn() },
      skills: { data: skillCatalogue, isLoading: false, isError: false },
      disasters: { data: disasterCatalogue, isLoading: false, isError: false },
    });
  });

  it("retrieves and displays backend catalogues and existing selections", async () => {
    const view = await renderScreen();
    expect(view.getByRole("checkbox", { name: "Existing skill" }).props.accessibilityState.checked).toBe(true);
    expect(view.getByRole("checkbox", { name: "Flood" }).props.accessibilityState.checked).toBe(true);
    expect(view.getByRole("checkbox", { name: "Earthquake" }).props.accessibilityState.checked).toBe(false);
    expect(view.getByText("New skill")).toBeTruthy();
  });

  it("adds multiple selected skills and disaster types", async () => {
    const view = await renderScreen();
    await fireEvent.press(view.getByRole("checkbox", { name: "New skill" }));
    await fireEvent.press(view.getByRole("checkbox", { name: "Earthquake" }));
    await fireEvent.press(view.getByText("Save selections"));

    await waitFor(() => expect(mockAddSkills).toHaveBeenCalledWith("session-token", ["20000000-0000-4000-8000-000000000002"]));
    expect(mockAddDisasterTypes).toHaveBeenCalledWith("session-token", ["30000000-0000-4000-8000-000000000002"]);
    expect(await view.findByText("Your skills and disaster selections have been saved.")).toBeTruthy();
  });

  it("removes previously saved skill and disaster selections", async () => {
    const view = await renderScreen();
    await fireEvent.press(view.getByRole("checkbox", { name: "Existing skill" }));
    await fireEvent.press(view.getByRole("checkbox", { name: "Flood" }));
    await fireEvent.press(view.getByText("Save selections"));

    await waitFor(() => expect(mockRemoveSkill).toHaveBeenCalledWith("session-token", "20000000-0000-4000-8000-000000000001"));
    expect(mockRemoveDisasterType).toHaveBeenCalledWith("session-token", "30000000-0000-4000-8000-000000000001");
  });

  it("shows empty and error catalogue states", async () => {
    mockUseVolunteerData.mockReturnValue({
      profile: { data: profile, isLoading: false, isError: false, refetch: jest.fn() },
      skills: { data: [], isLoading: false, isError: false },
      disasters: { data: [], isLoading: false, isError: false },
    });
    const emptyView = await renderScreen();
    expect(emptyView.getByText("The approved skills catalogue is empty. Skills will appear here once approved entries are added.")).toBeTruthy();
    expect(emptyView.getByText("No supported disaster types are currently available.")).toBeTruthy();
    emptyView.unmount();

    mockUseVolunteerData.mockReturnValue({
      profile: { data: profile, isLoading: false, isError: false, refetch: jest.fn() },
      skills: { data: undefined, isLoading: false, isError: true },
      disasters: { data: disasterCatalogue, isLoading: false, isError: false },
    });
    const errorView = await renderScreen();
    expect(errorView.getByText("The selection catalogues could not be loaded.")).toBeTruthy();
    errorView.unmount();

  });

});
