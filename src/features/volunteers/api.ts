export type CatalogueItem = { id: string; name: string };
export type VolunteerLocation = { latitude: number; longitude: number };
export type VolunteerProfileUpdate = {
  localAreaKnowledge?: boolean;
  location?: VolunteerLocation | null;
};
export type VolunteerProfile = {
  id: string;
  localAreaKnowledge: boolean | null;
  createdAt: string;
  updatedAt: string;
  location?: VolunteerLocation | null;
  skills: CatalogueItem[];
  disasterTypes: CatalogueItem[];
};
export type OrganizationVolunteer = {
  id: string;
  name: string;
  role: string;
  localAreaKnowledge: boolean | null;
  skills: CatalogueItem[];
  disasterTypes: CatalogueItem[];
};

type ApiEnvelope<T> = { data: T };
type ApiErrorPayload = { error?: { code?: string; message?: string } };

const apiBaseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/$/, "");

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  if (!apiBaseUrl) throw new Error("The API address is not configured. Set EXPO_PUBLIC_API_URL in .env.local to your backend address (for example, http://192.168.1.10:3000), then restart Expo and try again.");
  let response: Response;
  try {
    response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
    });
  } catch {
    throw new Error("Could not reach VolunteerConnect. Check your connection and try again.");
  }
  const responseText = await response.text();
  let body: ApiEnvelope<T> & ApiErrorPayload;
  try {
    body = JSON.parse(responseText) as ApiEnvelope<T> & ApiErrorPayload;
  } catch {
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      throw new Error(
        `The backend returned a non-JSON response (${response.status}). Check that EXPO_PUBLIC_API_URL points to the running VolunteerConnect backend, not the Expo app address.`,
      );
    }
    throw new Error(`The backend returned an invalid JSON response (${response.status}). Please try again or contact support.`);
  }
  if (!body || typeof body !== "object") {
    throw new Error("The backend returned an unexpected response. Please try again.");
  }
  if (!response.ok) {
    const error = new Error(body.error?.message ?? "The request could not be completed.") as Error & { status?: number; code?: string };
    error.status = response.status;
    error.code = body.error?.code;
    throw error;
  }
  return body.data;
}

export function getVolunteerProfile(token: string) {
  return request<VolunteerProfile>("/volunteers/me", token);
}
export function createVolunteerProfile(token: string) {
  return request<VolunteerProfile>("/volunteers/me", token, { method: "POST", body: "{}" });
}
export function getSkillCatalogue(token: string) {
  return request<CatalogueItem[]>("/volunteer-skills", token);
}
export function getDisasterTypes(token: string) {
  return request<CatalogueItem[]>("/disaster-types", token);
}
export function updateVolunteerProfile(token: string, values: VolunteerProfileUpdate) {
  return request<VolunteerProfile>("/volunteers/me", token, { method: "PATCH", body: JSON.stringify(values) });
}
export function updateLocalKnowledge(token: string, localAreaKnowledge: boolean) {
  return updateVolunteerProfile(token, { localAreaKnowledge });
}
export function addSkills(token: string, skillIds: string[]) {
  return request<VolunteerProfile>("/volunteers/me/skills", token, { method: "POST", body: JSON.stringify({ skillIds }) });
}
export function removeSkill(token: string, id: string) {
  return request<VolunteerProfile>(`/volunteers/me/skills/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}
export function addDisasterTypes(token: string, disasterTypeIds: string[]) {
  return request<VolunteerProfile>("/volunteers/me/disaster-types", token, { method: "POST", body: JSON.stringify({ disasterTypeIds }) });
}
export function removeDisasterType(token: string, id: string) {
  return request<VolunteerProfile>(`/volunteers/me/disaster-types/${encodeURIComponent(id)}`, token, { method: "DELETE" });
}
export function getOrganizationVolunteers(token: string) {
  return request<OrganizationVolunteer[]>("/organizations/me/volunteers", token);
}
export function getOrganizationVolunteer(token: string, id: string) {
  return request<OrganizationVolunteer>(`/organizations/me/volunteers/${encodeURIComponent(id)}`, token);
}
