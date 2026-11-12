import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationMembership } from "@clerk/express";
import type { AddDisasterTypesInput, AddSkillsInput, UpdateProfileInput } from "./schemas.js";
import { ApiError } from "../../lib/api-error.js";
import { readPostgisPoint, toPostgisPointWkt } from "../../lib/geography.js";

const SUPPORTED_DISASTERS = ["Flood", "Earthquake"] as const;

export class VolunteerApiError extends ApiError {
  constructor(status: number, code: string, message: string) {
    super(status, code, message);
    this.name = "VolunteerApiError";
  }
}

type ProfileRow = {
  id: string;
  location: string | null;
  local_area_knowledge: boolean | null;
  created_at: string;
  updated_at: string;
};

function failDatabase(error: unknown): never {
  // Keep provider messages and SQL details out of API responses and logs.
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  if (code === "23505") {
    throw new VolunteerApiError(409, "PROFILE_ALREADY_EXISTS", "A volunteer profile already exists.");
  }
  const failure = new Error("Volunteer data operation failed.") as Error & { providerCode?: string };
  if (typeof code === "string") failure.providerCode = code;
  throw failure;
}

async function query<T>(operation: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const result = await operation;
  if (result.error) failDatabase(result.error);
  if (result.data === null) throw new Error("Expected database data was not returned.");
  return result.data;
}

async function getProfile(supabase: SupabaseClient, userId: string): Promise<ProfileRow> {
  const mappingResult = await supabase.from("app_users").select("id").eq("clerk_user_id", userId).maybeSingle();
  if (mappingResult.error) failDatabase(mappingResult.error);
  const mapping = mappingResult.data as { id: string } | null;
  if (!mapping) throw new VolunteerApiError(404, "PROFILE_NOT_FOUND", "A volunteer profile has not been created.");
  const profile = await supabase.from("volunteer_profiles")
    .select("id, location, local_area_knowledge, created_at, updated_at")
    .eq("app_user_id", mapping.id)
    .maybeSingle();
  if (profile.error) failDatabase(profile.error);
  if (!profile.data) {
    throw new VolunteerApiError(404, "PROFILE_NOT_FOUND", "A volunteer profile has not been created.");
  }
  return profile.data as ProfileRow;
}

async function profileResponse(supabase: SupabaseClient, userId: string) {
  const profile = await getProfile(supabase, userId);
  const [skillsResult, disastersResult] = await Promise.all([
    supabase.from("volunteer_skills")
      .select("skill:skills(id, name)")
      .eq("volunteer_profile_id", profile.id),
    supabase.from("volunteer_disaster_types")
      .select("disaster_type:disaster_types(id, name)")
      .eq("volunteer_profile_id", profile.id),
  ]);
  if (skillsResult.error || disastersResult.error) failDatabase(skillsResult.error ?? disastersResult.error);
  const skillRows = (skillsResult.data ?? []) as unknown as Array<{ skill?: { id: string; name: string } | null }>;
  const disasterRows = (disastersResult.data ?? []) as unknown as Array<{ disaster_type?: { id: string; name: string } | null }>;
  const skills = skillRows.flatMap((row) => row.skill ? [row.skill] : []);
  const disasterTypes = disasterRows.flatMap((row) => row.disaster_type ? [row.disaster_type] : []);
  return {
    id: profile.id,
    location: readPostgisPoint(profile.location),
    localAreaKnowledge: profile.local_area_knowledge,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    skills,
    disasterTypes,
  };
}

export async function createVolunteerProfile(supabase: SupabaseClient, userId: string) {
  const mapping = await query<{ id: string }>(
    supabase.from("app_users").upsert({ clerk_user_id: userId }, { onConflict: "clerk_user_id" }).select("id").single(),
  );
  const result = await supabase.from("volunteer_profiles")
    .insert({ app_user_id: mapping.id })
    .select("id, local_area_knowledge, created_at, updated_at")
    .single();
  if (result.error) failDatabase(result.error);
  return {
    id: result.data.id,
    location: null,
    localAreaKnowledge: result.data.local_area_knowledge,
    createdAt: result.data.created_at,
    updatedAt: result.data.updated_at,
    skills: [],
    disasterTypes: [],
  };
}

export async function readVolunteerProfile(supabase: SupabaseClient, userId: string) {
  return profileResponse(supabase, userId);
}

export async function updateVolunteerProfile(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateProfileInput,
) {
  const profile = await getProfile(supabase, userId);
  const update: Record<string, unknown> = {};
  if (input.localAreaKnowledge !== undefined) update.local_area_knowledge = input.localAreaKnowledge;
  if (input.location !== undefined) {
    update.location = input.location === null
      ? null
      : toPostgisPointWkt(input.location);
  }
  const result = await supabase.from("volunteer_profiles")
    .update(update)
    .eq("id", profile.id)
    .select("id, local_area_knowledge, created_at, updated_at")
    .single();
  if (result.error) failDatabase(result.error);
  return profileResponse(supabase, userId);
}

export async function listSkills(supabase: SupabaseClient) {
  const result = await supabase.from("skills").select("id, name").order("name", { ascending: true });
  if (result.error) failDatabase(result.error);
  return result.data ?? [];
}

export async function listDisasterTypes(supabase: SupabaseClient) {
  const result = await supabase.from("disaster_types").select("id, name").in("name", [...SUPPORTED_DISASTERS]).order("name", { ascending: true });
  if (result.error) failDatabase(result.error);
  return result.data ?? [];
}

export async function addVolunteerSkills(supabase: SupabaseClient, userId: string, input: AddSkillsInput) {
  const profile = await getProfile(supabase, userId);
  const catalogue = await listSkills(supabase);
  const availableIds = new Set(catalogue.map((skill: { id: string }) => skill.id));
  if (input.skillIds.some((id) => !availableIds.has(id))) {
    throw new VolunteerApiError(400, "INVALID_SKILL", "One or more skill IDs are not in the available catalogue.");
  }
  const result = await supabase.from("volunteer_skills").upsert(
    input.skillIds.map((skillId) => ({ volunteer_profile_id: profile.id, skill_id: skillId })),
    { onConflict: "volunteer_profile_id,skill_id", ignoreDuplicates: true },
  );
  if (result.error) failDatabase(result.error);
  return profileResponse(supabase, userId);
}

export async function removeVolunteerSkill(supabase: SupabaseClient, userId: string, skillId: string) {
  const profile = await getProfile(supabase, userId);
  const result = await supabase.from("volunteer_skills").delete()
    .eq("volunteer_profile_id", profile.id).eq("skill_id", skillId);
  if (result.error) failDatabase(result.error);
  return profileResponse(supabase, userId);
}

export async function addVolunteerDisasterTypes(
  supabase: SupabaseClient,
  userId: string,
  input: AddDisasterTypesInput,
) {
  const profile = await getProfile(supabase, userId);
  const catalogue = await listDisasterTypes(supabase);
  const availableIds = new Set(catalogue.map((type: { id: string }) => type.id));
  if (input.disasterTypeIds.some((id) => !availableIds.has(id))) {
    throw new VolunteerApiError(400, "INVALID_DISASTER_TYPE", "One or more disaster type IDs are not supported.");
  }
  const result = await supabase.from("volunteer_disaster_types").upsert(
    input.disasterTypeIds.map((disasterTypeId) => ({ volunteer_profile_id: profile.id, disaster_type_id: disasterTypeId })),
    { onConflict: "volunteer_profile_id,disaster_type_id", ignoreDuplicates: true },
  );
  if (result.error) failDatabase(result.error);
  return profileResponse(supabase, userId);
}

export async function removeVolunteerDisasterType(supabase: SupabaseClient, userId: string, disasterTypeId: string) {
  const profile = await getProfile(supabase, userId);
  const result = await supabase.from("volunteer_disaster_types").delete()
    .eq("volunteer_profile_id", profile.id).eq("disaster_type_id", disasterTypeId);
  if (result.error) failDatabase(result.error);
  return profileResponse(supabase, userId);
}

type OrganizationVolunteer = {
  id: string;
  name: string;
  role: string;
  skills: Array<{ id: string; name: string }>;
  disasterTypes: Array<{ id: string; name: string }>;
  localAreaKnowledge: boolean | null;
};

function organizationMemberIds(memberships: OrganizationMembership[]) {
  return [...new Set(memberships.map((membership) => membership.publicUserData?.userId).filter((id): id is string => Boolean(id)))];
}

function assertOrganizationRole(role: string) {
  // Organization volunteer information is read-only for the roles supported by this app.
  if (role !== "org:admin" && role !== "org:member") {
    throw new VolunteerApiError(403, "ORGANIZATION_PERMISSION_REQUIRED", "Your organization role cannot view volunteer profiles.");
  }
}

export async function listOrganizationVolunteers(
  supabase: SupabaseClient,
  memberships: OrganizationMembership[],
  role: string,
): Promise<OrganizationVolunteer[]> {
  assertOrganizationRole(role);
  const userIds = organizationMemberIds(memberships);
  if (userIds.length === 0) return [];
  const mappingsResult = await supabase.from("app_users").select("id, clerk_user_id").in("clerk_user_id", userIds);
  if (mappingsResult.error) failDatabase(mappingsResult.error);
  const mappings = (mappingsResult.data ?? []) as Array<{ id: string; clerk_user_id: string }>;
  if (mappings.length === 0) return [];
  const profilesResult = await supabase.from("volunteer_profiles")
    .select("id, app_user_id, local_area_knowledge")
    .in("app_user_id", mappings.map((item) => item.id));
  if (profilesResult.error) failDatabase(profilesResult.error);
  const profiles = (profilesResult.data ?? []) as Array<{ id: string; app_user_id: string; local_area_knowledge: boolean | null }>;
  const profileToUser = new Map(mappings.map((item) => [item.id, item.clerk_user_id]));
  return Promise.all(profiles.map(async (profile) => ({
    ...(await organizationVolunteerDetails(supabase, profile)),
    name: memberDisplayName(memberships, profileToUser.get(profile.app_user_id) ?? ""),
    role: memberRole(memberships, profileToUser.get(profile.app_user_id) ?? ""),
  })));
}

export async function readOrganizationVolunteer(
  supabase: SupabaseClient,
  memberships: OrganizationMembership[],
  profileId: string,
  role: string,
): Promise<OrganizationVolunteer> {
  assertOrganizationRole(role);
  const allowedUserIds = organizationMemberIds(memberships);
  if (allowedUserIds.length === 0) throw organizationVolunteerNotFound();
  const mappingResult = await supabase.from("app_users").select("id, clerk_user_id").in("clerk_user_id", allowedUserIds);
  if (mappingResult.error) failDatabase(mappingResult.error);
  const mappings = (mappingResult.data ?? []) as Array<{ id: string; clerk_user_id: string }>;
  if (mappings.length === 0) throw organizationVolunteerNotFound();
  const profileResult = await supabase.from("volunteer_profiles")
    .select("id, app_user_id, local_area_knowledge")
    .eq("id", profileId)
    .in("app_user_id", mappings.map((item) => item.id))
    .maybeSingle();
  if (profileResult.error) failDatabase(profileResult.error);
  if (!profileResult.data) throw organizationVolunteerNotFound();
  const profile = profileResult.data as { id: string; app_user_id: string; local_area_knowledge: boolean | null };
  const userId = mappings.find((item) => item.id === profile.app_user_id)?.clerk_user_id;
  if (!userId) throw organizationVolunteerNotFound();
  return { ...(await organizationVolunteerDetails(supabase, profile)), name: memberDisplayName(memberships, userId), role: memberRole(memberships, userId) };
}

async function organizationVolunteerDetails(
  supabase: SupabaseClient,
  profile: { id: string; local_area_knowledge: boolean | null },
) {
  const [skills, disasters] = await Promise.all([
    supabase.from("volunteer_skills").select("skill:skills(id, name)").eq("volunteer_profile_id", profile.id),
    supabase.from("volunteer_disaster_types").select("disaster_type:disaster_types(id, name)").eq("volunteer_profile_id", profile.id),
  ]);
  if (skills.error || disasters.error) failDatabase(skills.error ?? disasters.error);
  const skillRows = (skills.data ?? []) as unknown as Array<{ skill?: { id: string; name: string } | null }>;
  const disasterRows = (disasters.data ?? []) as unknown as Array<{ disaster_type?: { id: string; name: string } | null }>;
  return {
    id: profile.id,
    localAreaKnowledge: profile.local_area_knowledge,
    skills: skillRows.flatMap((row) => row.skill ? [row.skill] : []),
    disasterTypes: disasterRows.flatMap((row) => row.disaster_type ? [row.disaster_type] : []),
  };
}

function memberDisplayName(memberships: OrganizationMembership[], userId: string) {
  const user = memberships.find((membership) => membership.publicUserData?.userId === userId)?.publicUserData;
  return [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Organization volunteer";
}

function memberRole(memberships: OrganizationMembership[], userId: string) {
  return memberships.find((membership) => membership.publicUserData?.userId === userId)?.role ?? "Organization member";
}

function organizationVolunteerNotFound() {
  // Same response for missing and out-of-organization profiles prevents ID enumeration.
  return new VolunteerApiError(404, "VOLUNTEER_NOT_FOUND", "This volunteer is not available in your organization.");
}
