import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { Task } from "./api";
import TaskDetailsScreen from "../../app/(protected)/tasks/[id]";

const mockUseOrganizationTask = jest.fn();
const mockUpdateStatus = jest.fn();
const mockGetToken = jest.fn().mockResolvedValue("session-token");
const mockRouter = { back: jest.fn(), push: jest.fn(), replace: jest.fn() };
const mockTaskId = "a1000000-0000-4000-8000-000000000001";

jest.mock("@clerk/expo", () => ({
  useAuth: () => ({ orgId: "clerk-org-1", getToken: mockGetToken }),
  useOrganization: () => ({ organization: { name: "Relief Organization" } }),
}));
jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
  useLocalSearchParams: () => ({ id: mockTaskId }),
}));
jest.mock("../../features/tasks/queries", () => ({
  organizationTaskKey: (orgId: string | null, id: string) => ["organization-task", orgId, id],
  organizationTasksKey: (orgId: string | null) => ["organization-tasks", orgId],
  useOrganizationTask: (...args: unknown[]) => mockUseOrganizationTask(...args),
}));
jest.mock("../../features/tasks/api", () => ({
  updateOrganizationTaskStatus: (...args: unknown[]) => mockUpdateStatus(...args),
}));

const task: Task = {
  id: mockTaskId,
  organizationId: "internal-org-1",
  disasterType: { id: "disaster-1", name: "Flood" },
  description: "Deliver clean water",
  affectedLocation: { latitude: 33.6844, longitude: 73.0479 },
  requiredSkills: [{ id: "skill-1", name: "First Aid" }],
  requiredVolunteerCount: 5,
  status: "Open",
  createdAt: "2026-11-01T10:00:00.000Z",
  updatedAt: "2026-11-02T10:00:00.000Z",
};

async function renderScreen(status: Task["status"]) {
  mockUseOrganizationTask.mockReturnValue({ data: { ...task, status }, isLoading: false, isError: false, refetch: jest.fn() });
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false }, mutations: { gcTime: 0, retry: false } } })}>
      <TaskDetailsScreen />
    </QueryClientProvider>,
  );
}

describe("Task lifecycle actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetToken.mockResolvedValue("session-token");
  });

  it("keeps Assign Task unavailable until matching and responses can be reviewed", async () => {
    const view = await renderScreen("Open");
    const assign = view.getByRole("button", { name: "Assign Task" });
    expect(assign.props.accessibilityState.disabled).toBe(true);
    expect(view.getByText(/matching report and volunteer or organization responses are reviewed/)).toBeTruthy();
    fireEvent.press(assign);
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("moves Assigned tasks to Ongoing through Start Task", async () => {
    mockUpdateStatus.mockResolvedValue({ ...task, status: "Ongoing" });
    const view = await renderScreen("Assigned");
    fireEvent.press(view.getByRole("button", { name: "Start Task" }));
    await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledWith("session-token", mockTaskId, "Ongoing"));
    expect(await view.findByText("Task moved to Ongoing.")).toBeTruthy();
  });

  it("moves Ongoing tasks to Completed through Complete Task", async () => {
    mockUpdateStatus.mockResolvedValue({ ...task, status: "Completed" });
    const view = await renderScreen("Ongoing");
    fireEvent.press(view.getByRole("button", { name: "Complete Task" }));
    await waitFor(() => expect(mockUpdateStatus).toHaveBeenCalledWith("session-token", mockTaskId, "Completed"));
    expect(await view.findByText("Task moved to Completed.")).toBeTruthy();
  });

  it("offers no lifecycle action for a Completed task", async () => {
    const view = await renderScreen("Completed");
    expect(view.queryByRole("button", { name: "Assign Task" })).toBeNull();
    expect(view.queryByRole("button", { name: "Start Task" })).toBeNull();
    expect(view.queryByRole("button", { name: "Complete Task" })).toBeNull();
  });
});
