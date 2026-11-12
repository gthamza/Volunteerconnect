export type TaskStatus = "Open" | "Assigned" | "Ongoing" | "Completed";
export type Task = {
  id: string;
  organizationId: string;
  disasterType: { id: string; name: string };
  description: string;
  affectedLocation: { latitude: number; longitude: number };
  requiredSkills: { id: string; name: string }[];
  requiredVolunteerCount: number;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
};

type ApiEnvelope<T> = { data: T };
type ApiErrorPayload = { error?: { message?: string } };
const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!apiBaseUrl) {
    throw new Error("The API address is not configured. Set EXPO_PUBLIC_API_URL and restart Expo.");
  }
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new Error("Could not reach VolunteerConnect. Check your connection and try again.");
  }
  let body: ApiEnvelope<T> & ApiErrorPayload;
  try {
    body = await response.json() as ApiEnvelope<T> & ApiErrorPayload;
  } catch {
    throw new Error("The backend returned an invalid response. Please try again.");
  }
  if (!response.ok) throw new Error(body.error?.message ?? "Tasks could not be loaded. Please try again.");
  return body.data;
}

export function getOrganizationTasks(token: string) {
  return request<Task[]>("/tasks", token);
}

export function getOrganizationTask(token: string, id: string) {
  return request<Task>(`/tasks/${encodeURIComponent(id)}`, token);
}

export type CreateTaskInput = {
  disasterTypeId: string;
  description: string;
  affectedLocation: { latitude: number; longitude: number };
  requiredSkillIds: string[];
  requiredVolunteerCount: number;
};

export function createOrganizationTask(token: string, input: CreateTaskInput) {
  return request<Task>("/tasks", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type UpdateTaskInput = CreateTaskInput;

export function updateOrganizationTask(token: string, id: string, input: UpdateTaskInput) {
  return request<Task>(`/tasks/${encodeURIComponent(id)}`, token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export type NextTaskStatus = Exclude<TaskStatus, "Open">;

export function updateOrganizationTaskStatus(token: string, id: string, status: NextTaskStatus) {
  return request<Task>(`/tasks/${encodeURIComponent(id)}/status`, token, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
