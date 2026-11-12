import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { createOrganizationTask, type CreateTaskInput } from "../../../features/tasks/api";
import { organizationTasksKey } from "../../../features/tasks/queries";
import { useTaskCatalogues } from "../../../features/tasks/queries";
import { createTaskSchema, type CreateTaskForm } from "../../../features/tasks/validation";

const supportedDisasters = ["Flood", "Earthquake"];
const StyledSafeAreaView = styled(SafeAreaView);

function FieldError({ children }: { children?: string }) {
  return children ? <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">{children}</Text> : null;
}

function Option({ label, selected, onPress, accessibilityRole = "checkbox" }: { label: string; selected: boolean; onPress: () => void; accessibilityRole?: "checkbox" | "radio" }) {
  return (
    <Pressable accessibilityRole={accessibilityRole} accessibilityLabel={label} accessibilityState={accessibilityRole === "checkbox" ? { checked: selected } : { selected }} className={`min-h-12 flex-row items-center gap-3 rounded-xl border px-4 ${selected ? "border-forest bg-[#e8efe7] dark:bg-[#26372d]" : "border-forest/15 dark:border-white/15"}`} onPress={onPress}>
      {accessibilityRole === "checkbox" ? <View className={`h-5 w-5 items-center justify-center rounded border ${selected ? "border-forest bg-forest" : "border-muted dark:border-[#829087]"}`}>{selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}</View> : <View className={`h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-forest" : "border-muted dark:border-[#829087]"}`}>{selected ? <View className="h-2.5 w-2.5 rounded-full bg-forest" /> : null}</View>}
      <Text className="flex-1 text-sm font-medium text-ink dark:text-[#eff4ee]">{label}</Text>
    </Pressable>
  );
}

export default function CreateTaskScreen() {
  const router = useRouter();
  const { getToken, orgId } = useAuth();
  const queryClient = useQueryClient();
  const { skills, disasters } = useTaskCatalogues(orgId ?? null);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateTaskForm>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: { disasterTypeId: "", description: "", latitude: "", longitude: "", requiredSkillIds: [], requiredVolunteerCount: "" },
  });
  const selectedDisasterId = watch("disasterTypeId");

  const create = useMutation({
    mutationFn: async (values: CreateTaskForm) => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      const input: CreateTaskInput = {
        disasterTypeId: values.disasterTypeId,
        description: values.description.trim(),
        affectedLocation: { latitude: Number(values.latitude), longitude: Number(values.longitude) },
        requiredSkillIds: values.requiredSkillIds,
        requiredVolunteerCount: Number(values.requiredVolunteerCount),
      };
      return createOrganizationTask(token, input);
    },
    onSuccess: async (task) => {
      await queryClient.invalidateQueries({ queryKey: organizationTasksKey(orgId ?? null) });
      Alert.alert("Task created", "Your task has been saved with Open status.", [
        { text: "View task", onPress: () => router.replace({ pathname: "/tasks/[id]", params: { id: task.id } } as unknown as Href) },
      ]);
    },
  });

  const toggleSkill = (id: string) => {
    setSelectedSkillIds((current) => {
      const next = current.includes(id) ? current.filter((skillId) => skillId !== id) : [...current, id];
      setValue("requiredSkillIds", next, { shouldValidate: true, shouldDirty: true });
      return next;
    });
  };

  const onCancel = () => router.back();

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-5 pb-8 pt-4" keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" className="min-h-11 self-start justify-center" onPress={onCancel}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Cancel</Text></Pressable>
        <View><Text className="text-xs font-bold uppercase tracking-wider text-forest dark:text-[#b9ddc4]">Organization workspace</Text><Text className="mt-1 text-3xl font-bold text-ink dark:text-[#eff4ee]">Create task</Text><Text className="mt-2 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Describe the relief activity and the resources your organization needs.</Text></View>

        {!orgId ? <View className="rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="font-semibold text-ink dark:text-[#eff4ee]">Organization required</Text><Text className="mt-2 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Switch to an organization workspace to create tasks.</Text></View> : null}

        {orgId ? <>
          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Disaster type</Text>
            {disasters.isLoading ? <ActivityIndicator accessibilityLabel="Loading disaster types" /> : null}
            {disasters.isError ? <View className="gap-2"><Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">Disaster types could not be loaded.</Text><Pressable accessibilityRole="button" onPress={() => void disasters.refetch()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable></View> : null}
            {disasters.data?.filter(({ name }) => supportedDisasters.includes(name)).map((disaster) => <Option key={disaster.id} label={disaster.name} selected={selectedDisasterId === disaster.id} accessibilityRole="radio" onPress={() => setValue("disasterTypeId", disaster.id, { shouldValidate: true, shouldDirty: true })} />)}
            {disasters.isSuccess && !disasters.data.some(({ name }) => supportedDisasters.includes(name)) ? <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Flood and Earthquake are not currently available in the disaster catalogue.</Text> : null}
            <FieldError>{errors.disasterTypeId?.message}</FieldError>
          </View>

          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Task description</Text>
            <Controller control={control} name="description" render={({ field: { value, onChange, onBlur } }) => <TextInput accessibilityLabel="Task description" multiline textAlignVertical="top" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Describe the relief activity and requirements" className="min-h-32 rounded-xl border border-forest/20 px-4 py-3 text-base leading-6 text-ink dark:border-white/20 dark:text-[#eff4ee]" />} />
            <FieldError>{errors.description?.message}</FieldError>
          </View>

          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Affected location</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Enter the location coordinates manually. Interactive GIS mapping is not part of this screen.</Text>
            <Controller control={control} name="latitude" render={({ field: { value, onChange, onBlur } }) => <TextInput accessibilityLabel="Latitude" keyboardType="decimal-pad" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Latitude (-90 to 90)" className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]" />} />
            <FieldError>{errors.latitude?.message}</FieldError>
            <Controller control={control} name="longitude" render={({ field: { value, onChange, onBlur } }) => <TextInput accessibilityLabel="Longitude" keyboardType="decimal-pad" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Longitude (-180 to 180)" className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]" />} />
            <FieldError>{errors.longitude?.message}</FieldError>
          </View>

          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Required skills</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Choose all catalogue skills needed for this task. Selected: {selectedSkillIds.length}</Text>
            {skills.isLoading ? <ActivityIndicator accessibilityLabel="Loading skills" /> : null}
            {skills.isError ? <View className="gap-2"><Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">The skills catalogue could not be loaded.</Text><Pressable accessibilityRole="button" onPress={() => void skills.refetch()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable></View> : null}
            {skills.data?.length ? skills.data.map((skill) => <Option key={skill.id} label={skill.name} selected={selectedSkillIds.includes(skill.id)} onPress={() => toggleSkill(skill.id)} />) : null}
            {skills.isSuccess && skills.data.length === 0 ? <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">No approved skills are currently available. You can create a task without selecting skills.</Text> : null}
          </View>

          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Required volunteers</Text>
            <Controller control={control} name="requiredVolunteerCount" render={({ field: { value, onChange, onBlur } }) => <TextInput accessibilityLabel="Required volunteer count" keyboardType="number-pad" value={value} onChangeText={onChange} onBlur={onBlur} placeholder="Enter a positive whole number" className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]" />} />
            <FieldError>{errors.requiredVolunteerCount?.message}</FieldError>
          </View>

          {create.isError ? <Text accessibilityRole="alert" className="rounded-xl bg-white p-4 text-sm leading-5 text-red-700 dark:bg-[#202e26] dark:text-red-300">{create.error.message}</Text> : null}
          <View className="flex-row gap-3 pb-4">
            <Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl border border-forest/20 dark:border-white/20" disabled={create.isPending} onPress={onCancel}><Text className="font-semibold text-ink dark:text-[#eff4ee]">Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" className={`min-h-12 flex-1 items-center justify-center rounded-xl px-4 ${create.isPending || !disasters.isSuccess || !skills.isSuccess ? "bg-[#68836f]" : "bg-forest"}`} disabled={create.isPending || !disasters.isSuccess || !skills.isSuccess} onPress={() => void handleSubmit((values) => create.mutate(values))()}>
              {create.isPending ? <ActivityIndicator accessibilityLabel="Creating task" color="#ffffff" /> : <Text className="font-semibold text-white">Create task</Text>}
            </Pressable>
          </View>
        </> : null}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
