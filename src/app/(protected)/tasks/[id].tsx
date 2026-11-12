import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useAuth, useOrganization } from "@clerk/expo";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { updateOrganizationTaskStatus, type NextTaskStatus } from "../../../features/tasks/api";
import { organizationTaskKey, organizationTasksKey, useOrganizationTask } from "../../../features/tasks/queries";

const StyledSafeAreaView = styled(SafeAreaView);

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function TaskDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orgId, getToken } = useAuth();
  const { organization } = useOrganization();
  const query = useOrganizationTask(orgId ?? null, id ?? "");
  const queryClient = useQueryClient();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const statusUpdate = useMutation({
    mutationFn: async (status: NextTaskStatus) => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      return updateOrganizationTaskStatus(token, id ?? "", status);
    },
    onSuccess: async (updatedTask) => {
      queryClient.setQueryData(organizationTaskKey(orgId ?? null, id ?? ""), updatedTask);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationTaskKey(orgId ?? null, id ?? "") }),
        queryClient.invalidateQueries({ queryKey: organizationTasksKey(orgId ?? null) }),
      ]);
      setStatusMessage(`Task moved to ${updatedTask.status}.`);
    },
    onMutate: () => setStatusMessage(null),
  });
  const nextAction = query.data?.status === "Assigned"
    ? { label: "Start Task", status: "Ongoing" as const }
    : query.data?.status === "Ongoing"
      ? { label: "Complete Task", status: "Completed" as const }
      : null;

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-4">
        <Pressable accessibilityRole="button" className="min-h-11 self-start justify-center" onPress={() => router.back()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Back to tasks</Text></Pressable>
        {query.isLoading ? <View className="items-center gap-3 rounded-2xl bg-white p-8 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading task details" /><Text className="text-sm text-muted dark:text-[#b4c2b8]">Loading task details…</Text></View> : null}
        {query.isError ? <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="font-semibold text-red-700 dark:text-red-300">Task details could not be loaded</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">{query.error.message}</Text><Pressable accessibilityRole="button" className="min-h-11 self-start justify-center rounded-xl bg-forest px-4" onPress={() => void query.refetch()}><Text className="font-semibold text-white">Try again</Text></Pressable></View> : null}
        {query.data ? <View className="gap-5 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
          <View className="flex-row items-center justify-between gap-3"><Text className="flex-1 text-xs text-muted dark:text-[#b4c2b8]">Task ID: {query.data.id}</Text><Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-xl bg-forest px-4" onPress={() => router.push({ pathname: "/tasks/[id]/edit", params: { id: query.data!.id } } as unknown as import("expo-router").Href)}><Text className="font-semibold text-white">Edit task</Text></Pressable></View>
          <View className="gap-2"><Text className="text-xs font-bold uppercase tracking-wider text-forest dark:text-[#b9ddc4]">{query.data.disasterType.name} · {query.data.status}</Text><Text className="text-2xl font-bold leading-8 text-ink dark:text-[#eff4ee]">{query.data.description}</Text></View>
          <View className="gap-1"><Text className="text-sm font-semibold text-ink dark:text-[#eff4ee]">Affected location</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">{query.data.affectedLocation.latitude.toFixed(5)}, {query.data.affectedLocation.longitude.toFixed(5)}</Text></View>
          <View className="gap-1"><Text className="text-sm font-semibold text-ink dark:text-[#eff4ee]">Required skills</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">{query.data.requiredSkills.length ? query.data.requiredSkills.map((skill) => skill.name).join(", ") : "None specified"}</Text></View>
          <View className="gap-1"><Text className="text-sm font-semibold text-ink dark:text-[#eff4ee]">Volunteers required</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">{query.data.requiredVolunteerCount}</Text></View>
          <View className="gap-1"><Text className="text-sm font-semibold text-ink dark:text-[#eff4ee]">Owning organization</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">{organization?.name ?? query.data.organizationId}</Text></View>
          <View className="gap-1"><Text className="text-sm font-semibold text-ink dark:text-[#eff4ee]">Created</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">{formatDate(query.data.createdAt)}</Text></View>
          <View className="gap-1"><Text className="text-sm font-semibold text-ink dark:text-[#eff4ee]">Last updated</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">{formatDate(query.data.updatedAt)}</Text></View>
          {statusMessage ? <Text accessibilityRole="alert" className="text-sm font-semibold text-forest dark:text-[#b9ddc4]">{statusMessage}</Text> : null}
          {query.data.status === "Open" ? <View className="gap-3 border-t border-forest/10 pt-4 dark:border-white/10">
            <Text className="text-base font-bold text-ink dark:text-[#eff4ee]">Task lifecycle</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Assign Task will be available after the matching report and volunteer or organization responses are reviewed in the later phases. Creating a task does not assign volunteers.</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: true }} disabled className="min-h-12 items-center justify-center rounded-xl bg-[#68836f] px-4"><Text className="font-semibold text-white">Assign Task</Text></Pressable>
          </View> : null}
          {nextAction ? <View className="gap-3 border-t border-forest/10 pt-4 dark:border-white/10">
            <Text className="text-base font-bold text-ink dark:text-[#eff4ee]">Task lifecycle</Text>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: statusUpdate.isPending }} disabled={statusUpdate.isPending} className="min-h-12 flex-row items-center justify-center rounded-xl bg-forest px-4 active:opacity-80" onPress={() => statusUpdate.mutate(nextAction.status)}>
              {statusUpdate.isPending ? <ActivityIndicator accessibilityLabel={`${nextAction.label} in progress`} color="#ffffff" /> : <Text className="font-semibold text-white">{nextAction.label}</Text>}
            </Pressable>
          </View> : null}
        </View> : null}
        {query.data && statusUpdate.isError ? <Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{statusUpdate.error.message}</Text> : null}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
