import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useOrganizationTasks } from "./queries";
import type { TaskStatus } from "./api";

const statuses: TaskStatus[] = ["Open", "Assigned", "Ongoing", "Completed"];

export function OrganizationTaskDashboard({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const tasks = useOrganizationTasks(organizationId);
  const counts = statuses.map((status) => ({ status, count: tasks.data?.filter((task) => task.status === status).length ?? 0 }));
  const recent = (tasks.data ?? []).slice(0, 3);

  return (
    <View className="gap-4 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
      <View className="flex-row items-start justify-between gap-3">
        <Pressable accessibilityRole="button" accessibilityLabel="Open task dashboard" className="flex-1" onPress={() => router.push("/tasks" as Href)}>
          <Text className="text-xs font-bold uppercase tracking-wider text-forest dark:text-[#b9ddc4]">Disaster response</Text>
          <Text className="mt-1 text-xl font-bold text-ink dark:text-[#eff4ee]">Task dashboard</Text>
        </Pressable>
        <Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-xl bg-forest px-3" onPress={() => router.push("/tasks/create" as Href)}>
          <Text className="text-sm font-bold text-white">Create task</Text>
        </Pressable>
      </View>

      {tasks.isLoading ? <View className="flex-row items-center gap-3 py-2"><ActivityIndicator accessibilityLabel="Loading task dashboard" /><Text className="text-sm text-muted dark:text-[#b4c2b8]">Loading organization tasks…</Text></View> : null}
      {tasks.isError ? <View className="gap-2"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">Task overview could not be loaded. {tasks.error.message}</Text><Pressable accessibilityRole="button" className="min-h-10 self-start justify-center" onPress={() => void tasks.refetch()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable></View> : null}
      {tasks.isSuccess ? <>
        <View className="flex-row flex-wrap gap-2">
          <View className="min-w-[45%] flex-1 rounded-xl bg-canvas p-3 dark:bg-[#17231b]"><Text className="text-xs text-muted dark:text-[#b4c2b8]">Total tasks</Text><Text className="mt-1 text-xl font-bold text-ink dark:text-[#eff4ee]">{tasks.data.length}</Text></View>
          {counts.map(({ status, count }) => <View key={status} className="min-w-[45%] flex-1 rounded-xl bg-canvas p-3 dark:bg-[#17231b]"><Text className="text-xs text-muted dark:text-[#b4c2b8]">{status}</Text><Text className="mt-1 text-xl font-bold text-ink dark:text-[#eff4ee]">{count}</Text></View>)}
        </View>
        {recent.length ? <View className="gap-2"><Text className="font-semibold text-ink dark:text-[#eff4ee]">Recently created</Text>{recent.map((task) => <Pressable key={task.id} accessibilityRole="button" accessibilityLabel={`Open task: ${task.description}`} className="min-h-12 flex-row items-center justify-between gap-3 rounded-xl border border-forest/10 px-3 py-2 dark:border-white/10" onPress={() => router.push({ pathname: "/tasks/[id]", params: { id: task.id } } as unknown as Href)}><View className="flex-1"><Text numberOfLines={1} className="font-medium text-ink dark:text-[#eff4ee]">{task.description}</Text><Text className="mt-0.5 text-xs text-muted dark:text-[#b4c2b8]">{task.disasterType.name} · {task.status}</Text></View><Text className="text-lg text-forest dark:text-[#b9ddc4]">›</Text></Pressable>)}</View> : <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">No tasks yet. Create a task to coordinate relief work.</Text>}
      </> : null}
      <Pressable accessibilityRole="button" className="min-h-11 items-center justify-center rounded-xl border border-forest/20 dark:border-white/20" onPress={() => router.push("/tasks" as Href)}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Open task dashboard</Text></Pressable>
    </View>
  );
}
