import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { updateOrganizationTask, type CreateTaskInput } from "../../../../features/tasks/api";
import { organizationTaskKey, organizationTasksKey, useOrganizationTask, useTaskCatalogues } from "../../../../features/tasks/queries";
import { createTaskSchema, type CreateTaskForm } from "../../../../features/tasks/validation";

const StyledSafeAreaView = styled(SafeAreaView);

const supportedDisasters = ["Flood", "Earthquake"];

function FieldError({ children }: { children?: string }) {
  return children ? <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">{children}</Text> : null;
}

function Option({ label, selected, onPress, radio = false }: { label: string; selected: boolean; onPress: () => void; radio?: boolean }) {
  return (
    <Pressable accessibilityRole={radio ? "radio" : "checkbox"} accessibilityLabel={label} accessibilityState={radio ? { selected } : { checked: selected }} className={`min-h-12 flex-row items-center gap-3 rounded-xl border px-4 ${selected ? "border-forest bg-[#e8efe7] dark:bg-[#26372d]" : "border-forest/15 dark:border-white/15"}`} onPress={onPress}>
      {radio ? <View className={`h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-forest" : "border-muted dark:border-[#829087]"}`}>{selected ? <View className="h-2.5 w-2.5 rounded-full bg-forest" /> : null}</View> : <View className={`h-5 w-5 items-center justify-center rounded border ${selected ? "border-forest bg-forest" : "border-muted dark:border-[#829087]"}`}>{selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}</View>}
      <Text className="flex-1 text-sm font-medium text-ink dark:text-[#eff4ee]">{label}</Text>
    </Pressable>
  );
}

export default function EditTaskScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getToken, orgId } = useAuth();
  const queryClient = useQueryClient();
  const task = useOrganizationTask(orgId ?? null, id ?? "");
  const { skills, disasters } = useTaskCatalogues(orgId ?? null);
  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { disasterTypeId: "", description: "", latitude: "", longitude: "", requiredSkillIds: [], requiredVolunteerCount: "" },
  });
  const values = watch();

  useEffect(() => {
    if (!task.data) return;
    reset({
      disasterTypeId: task.data.disasterType.id,
      description: task.data.description,
      latitude: String(task.data.affectedLocation.latitude),
      longitude: String(task.data.affectedLocation.longitude),
      requiredSkillIds: task.data.requiredSkills.map((skill) => skill.id),
      requiredVolunteerCount: String(task.data.requiredVolunteerCount),
    });
  }, [task.data, reset]);

  const update = useMutation({
    mutationFn: async (form: CreateTaskForm) => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      const input: CreateTaskInput = {
        disasterTypeId: form.disasterTypeId,
        description: form.description.trim(),
        affectedLocation: { latitude: Number(form.latitude), longitude: Number(form.longitude) },
        requiredSkillIds: form.requiredSkillIds,
        requiredVolunteerCount: Number(form.requiredVolunteerCount),
      };
      return updateOrganizationTask(token, id, input);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(organizationTaskKey(orgId ?? null, id), updated);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: organizationTaskKey(orgId ?? null, id) }),
        queryClient.invalidateQueries({ queryKey: organizationTasksKey(orgId ?? null) }),
      ]);
      Alert.alert("Task updated", "Your changes have been saved.", [{ text: "Done", onPress: () => router.back() }]);
    },
  });

  const toggleSkill = (skillId: string) => {
    const current = values.requiredSkillIds ?? [];
    const next = current.includes(skillId) ? current.filter((item) => item !== skillId) : [...current, skillId];
    setValue("requiredSkillIds", next, { shouldValidate: true, shouldDirty: true });
  };

  const canSubmit = Boolean(orgId && task.data && skills.isSuccess && disasters.isSuccess && !update.isPending);

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-4" keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" className="min-h-11 self-start justify-center" onPress={() => router.back()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Cancel</Text></Pressable>
        <View><Text className="text-xs font-bold uppercase tracking-wider text-forest dark:text-[#b9ddc4]">Organization workspace</Text><Text className="mt-1 text-3xl font-bold text-ink dark:text-[#eff4ee]">Edit task</Text></View>

        {!orgId ? <View className="rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="font-semibold text-ink dark:text-[#eff4ee]">Organization required</Text><Text className="mt-2 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Switch to the task-owning organization to edit this task.</Text></View> : null}
        {orgId && task.isLoading ? <View className="items-center gap-3 rounded-2xl bg-white p-8 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading task" /><Text className="text-sm text-muted dark:text-[#b4c2b8]">Loading task…</Text></View> : null}
        {orgId && task.isError ? <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="font-semibold text-red-700 dark:text-red-300">Task could not be loaded</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">{task.error.message}</Text><Pressable accessibilityRole="button" className="min-h-11 self-start justify-center rounded-xl bg-forest px-4" onPress={() => void task.refetch()}><Text className="font-semibold text-white">Try again</Text></Pressable></View> : null}

        {orgId && task.data ? <>
          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Disaster type</Text>
            {disasters.isLoading ? <ActivityIndicator accessibilityLabel="Loading disaster types" /> : null}
            {disasters.isError ? <View className="gap-2"><Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">Disaster types could not be loaded.</Text><Pressable accessibilityRole="button" onPress={() => void disasters.refetch()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable></View> : null}
            {disasters.data?.filter(({ name }) => supportedDisasters.includes(name)).map((disaster) => <Option key={disaster.id} label={disaster.name} selected={values.disasterTypeId === disaster.id} radio onPress={() => setValue("disasterTypeId", disaster.id, { shouldValidate: true, shouldDirty: true })} />)}
            <FieldError>{errors.disasterTypeId?.message}</FieldError>
          </View>

          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Task description</Text><Controller control={control} name="description" render={({ field: { value, onChange, onBlur } }) => <TextInput accessibilityLabel="Task description" multiline textAlignVertical="top" value={value} onChangeText={onChange} onBlur={onBlur} className="min-h-32 rounded-xl border border-forest/20 px-4 py-3 text-base leading-6 text-ink dark:border-white/20 dark:text-[#eff4ee]" />} /><FieldError>{errors.description?.message}</FieldError></View>

          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Affected location</Text><Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Enter the task coordinates manually.</Text><Controller control={control} name="latitude" render={({ field: { value, onChange, onBlur } }) => <TextInput accessibilityLabel="Latitude" keyboardType="decimal-pad" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Latitude (-90 to 90)" className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]" />} /><FieldError>{errors.latitude?.message}</FieldError><Controller control={control} name="longitude" render={({ field: { value, onChange, onBlur } }) => <TextInput accessibilityLabel="Longitude" keyboardType="decimal-pad" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Longitude (-180 to 180)" className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]" />} /><FieldError>{errors.longitude?.message}</FieldError></View>

          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Required skills</Text><Text className="text-sm text-muted dark:text-[#b4c2b8]">Selected: {values.requiredSkillIds?.length ?? 0}</Text>{skills.isLoading ? <ActivityIndicator accessibilityLabel="Loading skills" /> : null}{skills.isError ? <View className="gap-2"><Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">The skills catalogue could not be loaded.</Text><Pressable accessibilityRole="button" onPress={() => void skills.refetch()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable></View> : null}{skills.data?.map((skill) => <Option key={skill.id} label={skill.name} selected={(values.requiredSkillIds ?? []).includes(skill.id)} onPress={() => toggleSkill(skill.id)} />)}</View>

          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Required volunteers</Text><Controller control={control} name="requiredVolunteerCount" render={({ field: { value, onChange, onBlur } }) => <TextInput accessibilityLabel="Required volunteer count" keyboardType="number-pad" value={value} onChangeText={onChange} onBlur={onBlur} className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]" />} /><FieldError>{errors.requiredVolunteerCount?.message}</FieldError></View>

          {update.isError ? <Text accessibilityRole="alert" className="rounded-xl bg-white p-4 text-sm leading-5 text-red-700 dark:bg-[#202e26] dark:text-red-300">{update.error.message}</Text> : null}
          <View className="flex-row gap-3 pb-4"><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl border border-forest/20 dark:border-white/20" disabled={update.isPending} onPress={() => router.back()}><Text className="font-semibold text-ink dark:text-[#eff4ee]">Cancel</Text></Pressable><Pressable accessibilityRole="button" className={`min-h-12 flex-1 items-center justify-center rounded-xl px-4 ${canSubmit ? "bg-forest" : "bg-[#68836f]"}`} disabled={!canSubmit} onPress={() => void handleSubmit((form) => update.mutate(form))()}>{update.isPending ? <ActivityIndicator accessibilityLabel="Saving task changes" color="#ffffff" /> : <Text className="font-semibold text-white">Save changes</Text>}</Pressable></View>
        </> : null}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
