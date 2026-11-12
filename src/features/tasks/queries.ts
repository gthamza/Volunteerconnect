import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/expo";
import { getOrganizationTask, getOrganizationTasks } from "./api";
import { getDisasterTypes, getSkillCatalogue } from "../volunteers/api";
import { disasterTypesKey, skillCatalogueKey } from "../volunteers/queries";

export const organizationTasksKey = (organizationId: string | null) => ["organization-tasks", organizationId] as const;
export const organizationTaskKey = (organizationId: string | null, taskId: string) => ["organization-task", organizationId, taskId] as const;

function useTaskQuery<T>(key: readonly unknown[], load: (token: string) => Promise<T>, enabled: boolean) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  return useQuery({
    queryKey: key,
    enabled: isLoaded && Boolean(isSignedIn && enabled),
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      return load(token);
    },
  });
}

export function useOrganizationTasks(organizationId: string | null) {
  return useTaskQuery(organizationTasksKey(organizationId), getOrganizationTasks, Boolean(organizationId));
}

export function useOrganizationTask(organizationId: string | null, taskId: string) {
  return useTaskQuery(organizationTaskKey(organizationId, taskId), (token) => getOrganizationTask(token, taskId), Boolean(organizationId && taskId));
}

export function useTaskCatalogues(organizationId: string | null) {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const enabled = isLoaded && Boolean(isSignedIn && organizationId);
  const load = async <T,>(fetchCatalogue: (token: string) => Promise<T>) => {
    const token = await getToken();
    if (!token) throw new Error("Your session expired. Sign in again to continue.");
    return fetchCatalogue(token);
  };
  return {
    skills: useQuery({ queryKey: skillCatalogueKey, enabled, queryFn: () => load(getSkillCatalogue) }),
    disasters: useQuery({ queryKey: disasterTypesKey, enabled, queryFn: () => load(getDisasterTypes) }),
  };
}
