import { fireEvent, render } from "@testing-library/react-native";
import { OrganizationTaskDashboard } from "./organization-task-dashboard";

const mockUseOrganizationTasks = jest.fn();
const mockRouter = { push: jest.fn() };

jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("./queries", () => ({ useOrganizationTasks: (...args: unknown[]) => mockUseOrganizationTasks(...args) }));

const fixture = {
  id: "task-1",
  description: "Deliver emergency water",
  disasterType: { id: "flood-id", name: "Flood" },
  status: "Open",
};

describe("Organization task dashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows task totals and recent organization tasks", async () => {
    mockUseOrganizationTasks.mockReturnValue({ data: [fixture], isSuccess: true, isLoading: false, isError: false });
    const view = await render(<OrganizationTaskDashboard organizationId="clerk-org-1" />);
    expect(mockUseOrganizationTasks).toHaveBeenCalledWith("clerk-org-1");
    expect(view.getByText("Task dashboard")).toBeTruthy();
    expect(view.getByText("Recently created")).toBeTruthy();
    expect(view.getByText("Deliver emergency water")).toBeTruthy();
    expect(view.getAllByText("1")).toHaveLength(2);
  });

  it("opens task creation, task details, and the task list", async () => {
    mockUseOrganizationTasks.mockReturnValue({ data: [fixture], isSuccess: true, isLoading: false, isError: false });
    const view = await render(<OrganizationTaskDashboard organizationId="clerk-org-1" />);
    await fireEvent.press(view.getByRole("button", { name: "Create task" }));
    await fireEvent.press(view.getByRole("button", { name: "Open task: Deliver emergency water" }));
    await fireEvent.press(view.getByRole("button", { name: "View all tasks" }));
    expect(mockRouter.push).toHaveBeenNthCalledWith(1, "/tasks/create");
    expect(mockRouter.push).toHaveBeenNthCalledWith(2, { pathname: "/tasks/[id]", params: { id: "task-1" } });
    expect(mockRouter.push).toHaveBeenNthCalledWith(3, "/tasks");
  });

});
