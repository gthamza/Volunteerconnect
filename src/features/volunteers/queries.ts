import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import { getDisasterTypes, getOrganizationVolunteer, getOrganizationVolunteers, getSkillCatalogue, getVolunteerProfile } from "./api";

export const volunteerProfileKey = ["volunteer-profile"] as const;
export const skillCatalogueKey = ["volunteer-skill-catalogue"] as const;
export const disasterTypesKey = ["volunteer-disaster-types"] as const;
export const organizationVolunteersKey = (organizationId: string | null) => ["organization-volunteers", organizationId] as const;
export const organizationVolunteerKey = (organizationId: string | null, volunteerId: string) => ["organization-volunteer", organizationId, volunteerId] as const;

export function useVolunteerData() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const enabled = isLoaded && Boolean(isSignedIn);
  const getProfile = async () => {
    const token = await getToken();
    if (!token) throw new Error("Your session expired. Sign in again to continue.");
    return getVolunteerProfile(token);
  };
  const getSkills = async () => {
    const token = await getToken();
    if (!token) throw new Error("Your session expired. Sign in again to continue.");
    return getSkillCatalogue(token);
  };
  const getDisasters = async () => {
    const token = await getToken();
    if (!token) throw new Error("Your session expired. Sign in again to continue.");
    return getDisasterTypes(token);
  };
  return {
    profile: useQuery({ queryKey: volunteerProfileKey, queryFn: getProfile, enabled }),
    skills: useQuery({ queryKey: skillCatalogueKey, queryFn: getSkills, enabled }),
    disasters: useQuery({ queryKey: disasterTypesKey, queryFn: getDisasters, enabled }),
  };
}

export function useOrganizationVolunteers(organizationId: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: organizationVolunteersKey(organizationId),
    enabled: isLoaded && Boolean(isSignedIn && organizationId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      return getOrganizationVolunteers(token);
    },
  });
}

export function useOrganizationVolunteer(organizationId: string | null, volunteerId: string) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: organizationVolunteerKey(organizationId, volunteerId),
    enabled: isLoaded && Boolean(isSignedIn && organizationId && volunteerId),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      return getOrganizationVolunteer(token, volunteerId);
    },
  });
}
