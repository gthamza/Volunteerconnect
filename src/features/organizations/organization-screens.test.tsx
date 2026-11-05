import { fireEvent, render } from "@testing-library/react-native";
import OrganizationProfileScreen from "../../app/(protected)/organization-profile";
import OrganizationVolunteersScreen from "../../app/(protected)/organization-volunteers";

const mockUseAuth = jest.fn();
const mockUseOrganization = jest.fn();
const mockUseOrganizationVolunteers = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("@clerk/expo", () => ({
  useAuth: () => mockUseAuth(),
  useOrganization: () => mockUseOrganization(),
}));
jest.mock("expo-router", () => ({
  Redirect: ({ href }: { href: string }) => <mockRedirect href={href} />,
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));
jest.mock("../../features/volunteers/queries", () => ({
  useOrganizationVolunteers: (...args: unknown[]) => mockUseOrganizationVolunteers(...args),
}));

describe("Organization profile and volunteer screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ orgId: "org-1", orgRole: "org:admin" });
    mockUseOrganization.mockReturnValue({ isLoaded: true, organization: { name: "Relief Network" } });
    mockUseOrganizationVolunteers.mockReturnValue({
      data: [{ id: "profile-1", name: "Amina Khan", role: "org:member", skills: [{ id: "s1", name: "First Aid" }], disasterTypes: [{ id: "d1", name: "Flood" }] }],
      isLoading: false,
      isError: false,
      isSuccess: true,
    });
  });

  it("shows the active Clerk organization and administrator role", async () => {
    const view = await render(<OrganizationProfileScreen />);
    expect(view.getByText("Relief Network")).toBeTruthy();
    expect(view.getByText("Administrator")).toBeTruthy();
    fireEvent.press(view.getByText("Manage volunteers"));
    expect(mockPush).toHaveBeenCalledWith("/organization-volunteers");
  });

  it("lists active-organization volunteers and renders an empty state", async () => {
    const view = await render(<OrganizationVolunteersScreen />);
    expect(mockUseOrganizationVolunteers).toHaveBeenCalledWith("org-1");
    expect(view.getByText("Amina Khan")).toBeTruthy();
    expect(view.getByText("1 skills · 1 supported disaster types")).toBeTruthy();

    mockUseOrganizationVolunteers.mockReturnValue({ data: [], isLoading: false, isError: false, isSuccess: true });
    view.unmount();
    const emptyView = await render(<OrganizationVolunteersScreen />);
    expect(emptyView.getByText("No volunteer profiles yet")).toBeTruthy();
  });
});
