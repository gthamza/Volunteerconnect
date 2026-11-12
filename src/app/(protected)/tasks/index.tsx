import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useAuth } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useOrganizationTasks } from "../../../features/tasks/queries";
import type { Task, TaskStatus } from "../../../features/tasks/api";

const filters: (TaskStatus | "All")[] = ["All", "Open", "Assigned", "Ongoing", "Completed"];
const StyledSafeAreaView = styled(SafeAreaView);

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function TaskCard({ task, onPress }: { task: Task; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open task: ${task.description}`} onPress={onPress} className="gap-4 rounded-2xl border border-forest/10 bg-white p-4 active:opacity-80 dark:border-white/10 dark:bg-[#202e26]">
      <View className="flex-row items-start justify-between gap-3">
        <Text className="flex-1 text-base font-bold leading-6 text-ink dark:text-[#eff4ee]">{task.description}</Text>
        <Text className="rounded-full bg-[#e8efe7] px-3 py-1.5 text-xs font-bold text-forest dark:bg-[#2b3a30] dark:text-[#b9ddc4]">{task.status}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        <Text className="rounded-lg bg-canvas px-2.5 py-1.5 text-xs font-semibold text-ink dark:bg-[#17231b] dark:text-[#eff4ee]">{task.disasterType.name}</Text>
        <Text className="rounded-lg bg-canvas px-2.5 py-1.5 text-xs text-muted dark:bg-[#17231b] dark:text-[#b4c2b8]">{task.requiredVolunteerCount} volunteers</Text>
      </View>
      <View className="gap-2">
        <Text className="text-sm text-muted dark:text-[#b4c2b8]">Affected location: {task.affectedLocation.latitude.toFixed(4)}, {task.affectedLocation.longitude.toFixed(4)}</Text>
        <Text className="text-sm text-muted dark:text-[#b4c2b8]">Required skills: {task.requiredSkills.length ? task.requiredSkills.map((skill) => skill.name).join(", ") : "None specified"}</Text>
        <Text className="text-xs text-muted dark:text-[#b4c2b8]">Created {formatDate(task.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

export default function TaskListScreen() {
  const router = useRouter();
  const { orgId } = useAuth();
  const tasksQuery = useOrganizationTasks(orgId ?? null);
  const [filter, setFilter] = useState<TaskStatus | "All">("All");
  const tasks = useMemo(() => (tasksQuery.data ?? []).filter((task) => filter === "All" || task.status === filter), [tasksQuery.data, filter]);

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-4" refreshControl={<RefreshControl refreshing={tasksQuery.isFetching && !tasksQuery.isLoading} onRefresh={() => void tasksQuery.refetch()} tintColor="#315d3d" />}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-forest dark:text-[#b9ddc4]">Organization workspace</Text>
            <Text className="mt-1 text-3xl font-bold text-ink dark:text-[#eff4ee]">Tasks</Text>
          </View>
          <Pressable accessibilityRole="button" className="min-h-12 justify-center rounded-xl bg-forest px-4 active:opacity-80" onPress={() => router.push("/tasks/create" as Href)}>
            <Text className="font-bold text-white">Create task</Text>
          </Pressable>
        </View>

        {!orgId ? (
          <View className="rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-base font-semibold text-ink dark:text-[#eff4ee]">Organization required</Text><Text className="mt-2 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Switch to an organization workspace to view its tasks.</Text></View>
        ) : null}

        {orgId ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {filters.map((status) => <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: filter === status }} className={`min-h-10 justify-center rounded-full px-4 ${filter === status ? "bg-forest" : "border border-forest/15 bg-white dark:border-white/15 dark:bg-[#202e26]"}`} onPress={() => setFilter(status)}><Text className={`text-sm font-semibold ${filter === status ? "text-white" : "text-ink dark:text-[#eff4ee]"}`}>{status}</Text></Pressable>)}
        </ScrollView> : null}

        {orgId && tasksQuery.isLoading ? <View className="items-center gap-3 rounded-2xl bg-white p-8 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading tasks" /><Text className="text-sm text-muted dark:text-[#b4c2b8]">Loading your organization’s tasks…</Text></View> : null}
        {orgId && tasksQuery.isError ? <View className="gap-3 rounded-2xl border border-red-200 bg-white p-5 dark:border-red-900 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="font-semibold text-red-700 dark:text-red-300">Tasks could not be loaded</Text><Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">{tasksQuery.error.message}</Text><Pressable accessibilityRole="button" className="min-h-11 self-start justify-center rounded-xl bg-forest px-4" onPress={() => void tasksQuery.refetch()}><Text className="font-semibold text-white">Try again</Text></Pressable></View> : null}
        {orgId && tasksQuery.isSuccess && tasks.length === 0 ? <View className="items-center gap-2 rounded-2xl bg-white px-6 py-10 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">{filter === "All" ? "No tasks yet" : `No ${filter.toLowerCase()} tasks`}</Text><Text className="text-center text-sm leading-5 text-muted dark:text-[#b4c2b8]">{filter === "All" ? "Create a task to coordinate your organization’s relief work." : "Choose another status filter to see more tasks."}</Text></View> : null}
        {orgId && tasks.length > 0 ? <View className="gap-3">{tasks.map((task) => <TaskCard key={task.id} task={task} onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: task.id } } as unknown as Href)} />)}</View> : null}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
