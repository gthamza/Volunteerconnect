import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { addDisasterTypes, addSkills, removeDisasterType, removeSkill, updateLocalKnowledge, type CatalogueItem } from "../../features/volunteers/api";
import { disasterTypesKey, skillCatalogueKey, volunteerProfileKey, useVolunteerData } from "../../features/volunteers/queries";
import { editProfileSchema, type EditProfileForm } from "../../features/volunteers/validation";

const StyledSafeAreaView = styled(SafeAreaView);

function ChoiceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} className={`min-h-12 flex-row items-center justify-between rounded-xl border px-4 py-3 ${selected ? "border-forest bg-[#e4ebe2] dark:bg-[#26372d]" : "border-forest/15 dark:border-white/15"}`} onPress={onPress}><Text className="flex-1 text-base text-ink dark:text-[#eff4ee]">{label}</Text><View className={`h-5 w-5 items-center justify-center rounded border ${selected ? "border-forest bg-forest" : "border-muted dark:border-[#b4c2b8]"}`}>{selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}</View></Pressable>;
}

function ToggleChoice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-4 ${selected ? "border-forest bg-[#e4ebe2] dark:bg-[#26372d]" : "border-forest/15 dark:border-white/15"}`} onPress={onPress}><Text className="font-semibold text-ink dark:text-[#eff4ee]">{label}</Text></Pressable>;
}

export default function EditVolunteerProfileScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { profile, skills, disasters } = useVolunteerData();
  const { control, handleSubmit, reset, formState: { errors } } = useForm<EditProfileForm>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { localAreaKnowledge: profile.data?.localAreaKnowledge ?? undefined, skillIds: [], disasterTypeIds: [] },
  });

  useEffect(() => {
    if (profile.data && skills.data && disasters.data) reset({
      localAreaKnowledge: profile.data.localAreaKnowledge ?? undefined,
      skillIds: profile.data.skills.map((item) => item.id),
      disasterTypeIds: profile.data.disasterTypes.map((item) => item.id),
    });
  }, [profile.data, skills.data, disasters.data, reset]);

  const save = useMutation({
    mutationFn: async (values: EditProfileForm) => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      const current = profile.data;
      if (!current) throw new Error("Create your volunteer profile before editing it.");
      if (!skills.data || !disasters.data) throw new Error("The approved profile catalogues could not be loaded. Refresh them before saving.");
      await updateLocalKnowledge(token, values.localAreaKnowledge);
      const oldSkillIds = new Set(current.skills.map((item) => item.id));
      const newSkillIds = new Set(values.skillIds);
      const skillAdds = values.skillIds.filter((id) => !oldSkillIds.has(id));
      if (skillAdds.length) await addSkills(token, skillAdds);
      for (const id of oldSkillIds) if (!newSkillIds.has(id)) await removeSkill(token, id);
      const oldDisasterIds = new Set(current.disasterTypes.map((item) => item.id));
      const newDisasterIds = new Set(values.disasterTypeIds);
      const disasterAdds = values.disasterTypeIds.filter((id) => !oldDisasterIds.has(id));
      if (disasterAdds.length) await addDisasterTypes(token, disasterAdds);
      for (const id of oldDisasterIds) if (!newDisasterIds.has(id)) await removeDisasterType(token, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: volunteerProfileKey });
      Alert.alert("Profile saved", "Your volunteer profile has been updated.");
      router.replace("/profile");
    },
  });

  const toggle = (ids: string[], id: string, onChange: (next: string[]) => void) => onChange(ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  const renderChoices = (catalogue: CatalogueItem[] | undefined, loading: boolean, hasError: boolean, selected: string[], onChange: (next: string[]) => void, label: string) => {
    if (loading) return <ActivityIndicator accessibilityLabel={`Loading ${label}`} />;
    if (hasError) return <Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">Could not load {label}. Use the refresh button to try again.</Text>;
    if (!catalogue?.length) return <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">No {label} are currently available in the API catalogue. Nothing has been added as a placeholder.</Text>;
    return catalogue.map((item) => <ChoiceRow key={item.id} label={item.name} selected={selected.includes(item.id)} onPress={() => toggle(selected, item.id, onChange)} />);
  };

  return <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]"><ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.back()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Profile</Text></Pressable>
    <View><Text className="text-3xl font-bold text-ink dark:text-[#eff4ee]">Edit profile</Text><Text className="mt-1 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Update the information currently supported by your volunteer profile.</Text></View>

    {profile.isLoading ? <View className="items-center rounded-2xl bg-white p-6 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading profile for editing" /></View> : null}
    {profile.isError ? <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{(profile.error as Error & { status?: number }).status === 404 ? "Create a volunteer profile before editing it." : profile.error.message}</Text><Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.replace("/profile")}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Return to profile</Text></Pressable></View> : null}

    {profile.data ? <>
      <View className="gap-4 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Local-area knowledge</Text><Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Do you have local-area knowledge?</Text><Controller control={control} name="localAreaKnowledge" render={({ field: { value, onChange } }) => <View className="flex-row gap-3"><ToggleChoice label="Yes" selected={value === true} onPress={() => onChange(true)} /><ToggleChoice label="No" selected={value === false} onPress={() => onChange(false)} /></View>} />{errors.localAreaKnowledge ? <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">{errors.localAreaKnowledge.message}</Text> : null}</View>

      <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Skills</Text><Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Choose from the skill catalogue configured for VolunteerConnect.</Text><Controller control={control} name="skillIds" render={({ field: { value, onChange } }) => <View className="gap-2">{renderChoices(skills.data, skills.isLoading, skills.isError, value, onChange, "skills")}</View>} /><Pressable accessibilityRole="button" className="min-h-10 self-start justify-center" onPress={() => void queryClient.invalidateQueries({ queryKey: skillCatalogueKey })}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Refresh skills</Text></Pressable></View>

      <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Supported disaster types</Text><Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Select the disasters you can support.</Text><Controller control={control} name="disasterTypeIds" render={({ field: { value, onChange } }) => <View className="gap-2">{renderChoices(disasters.data, disasters.isLoading, disasters.isError, value, onChange, "disaster types")}</View>} /><Pressable accessibilityRole="button" className="min-h-10 self-start justify-center" onPress={() => void queryClient.invalidateQueries({ queryKey: disasterTypesKey })}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Refresh disaster types</Text></Pressable></View>

      <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Other profile details</Text><Text className="text-sm leading-6 text-muted dark:text-[#b4c2b8]">Name and email are managed in Clerk. Phone, volunteer category, and organization affiliation are not part of the current profile API. Manage your location from the Location & local knowledge screen.</Text><Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.push("/location" as Href)}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Location & local knowledge</Text></Pressable></View>

      {save.isError ? <Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{save.error.message} If some changes already saved, review your profile and try again.</Text> : null}
      <View className="flex-row gap-3 pb-4"><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl border border-forest/20 dark:border-white/20" disabled={save.isPending} onPress={() => router.back()}><Text className="font-semibold text-ink dark:text-[#eff4ee]">Cancel</Text></Pressable><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl bg-forest px-4" disabled={save.isPending || skills.isLoading || disasters.isLoading || skills.isError || disasters.isError || !skills.data || !disasters.data} onPress={() => void handleSubmit((values) => save.mutate(values))()}>{save.isPending ? <ActivityIndicator color="#ffffff" accessibilityLabel="Saving profile" /> : <Text className="font-semibold text-white">Save changes</Text>}</Pressable></View>
    </> : null}
  </ScrollView></StyledSafeAreaView>;
}
