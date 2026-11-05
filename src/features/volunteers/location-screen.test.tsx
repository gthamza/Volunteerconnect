import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import LocationScreen from "../../app/(protected)/location";

const mockUseVolunteerData = jest.fn();
const mockUpdateProfile = jest.fn();
const mockGetToken = jest.fn().mockResolvedValue("session-token");
const mockRequestPermission = jest.fn();
const mockGetCurrentPosition = jest.fn();

jest.mock("@clerk/expo", () => ({ useAuth: () => ({ getToken: mockGetToken }) }));
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: () => mockRequestPermission(),
  getCurrentPositionAsync: () => mockGetCurrentPosition(),
  Accuracy: { Balanced: 3 },
}));
jest.mock("../../features/volunteers/queries", () => ({
  volunteerProfileKey: ["volunteer-profile"],
  useVolunteerData: () => mockUseVolunteerData(),
}));
jest.mock("../../features/volunteers/api", () => ({
  updateVolunteerProfile: (...args: unknown[]) => mockUpdateProfile(...args),
}));
jest.mock("../../features/volunteers/location-map", () => ({
  LocationMap: () => null,
}));

const profile = {
  id: "profile-id",
  localAreaKnowledge: null,
  location: null,
  createdAt: "2026-11-03T00:00:00Z",
  updatedAt: "2026-11-03T00:00:00Z",
  skills: [],
  disasterTypes: [],
};

async function renderScreen() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: 0 }, mutations: { gcTime: 0 } } });
  return await render(<QueryClientProvider client={queryClient}><LocationScreen /></QueryClientProvider>);
}

describe("Volunteer location screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("session-token");
    mockUseVolunteerData.mockReturnValue({ profile: { data: profile, isLoading: false, isError: false } });
    mockUpdateProfile.mockResolvedValue(profile);
  });

  it("keeps manual selection available when GPS permission is denied", async () => {
    mockRequestPermission.mockResolvedValue({ granted: false });
    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
      buttons?.[1]?.onPress?.();
    });
    const view = await renderScreen();

    await fireEvent.press(view.getByText("Use my current location"));
    expect(await view.findByText(/Location permission was not granted/)).toBeTruthy();
    expect(view.getByLabelText("Latitude")).toBeTruthy();
    expect(view.getByLabelText("Longitude")).toBeTruthy();
    expect(mockGetCurrentPosition).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  it("saves manually entered coordinates with a yes or no local-area answer", async () => {
    const view = await renderScreen();
    await fireEvent.press(view.getByRole("radio", { name: "Yes" }));
    await fireEvent.changeText(view.getByLabelText("Latitude"), "33.6844");
    await fireEvent.changeText(view.getByLabelText("Longitude"), "73.0479");
    await fireEvent.press(view.getByText("Save location"));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith("session-token", {
      localAreaKnowledge: true,
      location: { latitude: 33.6844, longitude: 73.0479 },
    }));
  });
});
