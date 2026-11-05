import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { addDisasterTypes, addSkills, removeDisasterType, removeSkill, type CatalogueItem } from "../../features/volunteers/api";
import { disasterTypesKey, skillCatalogueKey, volunteerProfileKey, useVolunteerData } from "../../features/volunteers/queries";
import { volunteerPreferencesSchema, type VolunteerPreferencesForm } from "../../features/volunteers/validation";

const StyledSafeAreaView = styled(SafeAreaView);

function ChoiceRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: selected }} className={`min-h-12 flex-row items-center justify-between rounded-xl border px-4 py-3 ${selected ? "border-forest bg-[#e4ebe2] dark:bg-[#26372d]" : "border-forest/15 dark:border-white/15"}`} onPress={onPress}><Text className="flex-1 text-base text-ink dark:text-[#eff4ee]">{label}</Text><View className={`h-5 w-5 items-center justify-center rounded border ${selected ? "border-forest bg-forest" : "border-muted dark:border-[#b4c2b8]"}`}>{selected ? <Text className="text-xs font-bold text-white">✓</Text> : null}</View></Pressable>;
}

export default function SkillsSelectionScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { profile, skills, disasters } = useVolunteerData();
  const [saved, setSaved] = useState(false);
  const { control, handleSubmit, reset } = useForm<VolunteerPreferencesForm>({
    resolver: zodResolver(volunteerPreferencesSchema),
    defaultValues: { skillIds: [], disasterTypeIds: [] },
  });

  useEffect(() => {
    if (profile.data && skills.data && disasters.data) reset({
      skillIds: profile.data.skills.map(({ id }) => id),
      disasterTypeIds: profile.data.disasterTypes.map(({ id }) => id),
    });
  }, [profile.data, skills.data, disasters.data, reset]);

  const save = useMutation({
    mutationFn: async (values: VolunteerPreferencesForm) => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      const current = profile.data;
      if (!current) throw new Error("Create your volunteer profile before selecting preferences.");
      if (!skills.data || !disasters.data) throw new Error("The available catalogues could not be loaded. Refresh them before saving.");

      const oldSkills = new Set(current.skills.map(({ id }) => id));
      const nextSkills = new Set(values.skillIds);
      const addSkillIds = [...nextSkills].filter((id) => !oldSkills.has(id));
      if (addSkillIds.length) await addSkills(token, addSkillIds);
      for (const id of oldSkills) if (!nextSkills.has(id)) await removeSkill(token, id);

      const oldDisasters = new Set(current.disasterTypes.map(({ id }) => id));
      const nextDisasters = new Set(values.disasterTypeIds);
      const addDisasterIds = [...nextDisasters].filter((id) => !oldDisasters.has(id));
      if (addDisasterIds.length) await addDisasterTypes(token, addDisasterIds);
      for (const id of oldDisasters) if (!nextDisasters.has(id)) await removeDisasterType(token, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: volunteerProfileKey });
      setSaved(true);
    },
    onError: () => setSaved(false),
  });

  const toggle = (ids: string[], id: string, onChange: (next: string[]) => void) => {
    setSaved(false);
    onChange(ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  };
  const renderCatalogue = (items: CatalogueItem[] | undefined, isLoading: boolean, isError: boolean, selected: string[], onChange: (value: string[]) => void, label: string) => {
    if (isLoading) return <ActivityIndicator accessibilityLabel={`Loading ${label}`} />;
    if (isError) return <Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">Could not load {label}. Refresh to try again.</Text>;
    if (!items?.length) {
      const emptyMessage = label === "skills"
        ? "The approved skills catalogue is empty. Skills will appear here once approved entries are added."
        : "No supported disaster types are currently available.";
      return <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">{emptyMessage}</Text>;
    }
    return items.map((item) => <ChoiceRow key={item.id} label={item.name} selected={selected.includes(item.id)} onPress={() => toggle(selected, item.id, onChange)} />);
  };

  const refresh = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: skillCatalogueKey }),
      queryClient.invalidateQueries({ queryKey: disasterTypesKey }),
      profile.refetch(),
    ]);
  };

  const profileMissing = (profile.error as (Error & { status?: number }) | null)?.status === 404;
  const loading = profile.isLoading || skills.isLoading || disasters.isLoading;
  const unavailable = profile.isError || skills.isError || disasters.isError;

  return <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]"><ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
    <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.back()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Profile</Text></Pressable>
    <View><Text className="text-3xl font-bold text-ink dark:text-[#eff4ee]">Skills selection</Text><Text className="mt-1 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Choose the skills you can offer and the disaster types you can support.</Text></View>

    {loading ? <View className="items-center rounded-2xl bg-white p-6 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading skills and disaster preferences" /><Text className="mt-3 text-sm text-muted dark:text-[#b4c2b8]">Loading your selections…</Text></View> : null}
    {unavailable ? <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{profileMissing ? "Create a volunteer profile before choosing skills and disaster types." : profile.isError ? profile.error.message : "The selection catalogues could not be loaded."}</Text><Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={refresh}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable></View> : null}

    {profile.data && skills.data && disasters.data ? <>
      <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Skills</Text><Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Select all skills that apply. You can remove a selection at any time.</Text><Controller control={control} name="skillIds" render={({ field: { value, onChange } }) => <View className="gap-2">{renderCatalogue(skills.data, skills.isLoading, skills.isError, value, onChange, "skills")}</View>} /><Pressable accessibilityRole="button" className="min-h-10 self-start justify-center" onPress={() => void queryClient.invalidateQueries({ queryKey: skillCatalogueKey })}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Refresh skills</Text></Pressable></View>
      <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Supported disaster types</Text><Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Flood and Earthquake are the supported disaster types.</Text><Controller control={control} name="disasterTypeIds" render={({ field: { value, onChange } }) => <View className="gap-2">{renderCatalogue(disasters.data, disasters.isLoading, disasters.isError, value, onChange, "disaster types")}</View>} /><Pressable accessibilityRole="button" className="min-h-10 self-start justify-center" onPress={() => void queryClient.invalidateQueries({ queryKey: disasterTypesKey })}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Refresh disaster types</Text></Pressable></View>
      {save.isError ? <Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{save.error.message} Some changes may already have saved. Review your profile before retrying.</Text> : null}
      {saved ? <Text accessibilityRole="alert" className="text-sm font-semibold text-forest dark:text-[#b9ddc4]">Your skills and disaster selections have been saved.</Text> : null}
      <View className="flex-row gap-3 pb-4"><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl border border-forest/20 dark:border-white/20" disabled={save.isPending} onPress={() => router.back()}><Text className="font-semibold text-ink dark:text-[#eff4ee]">Cancel</Text></Pressable><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl bg-forest px-4" disabled={save.isPending || skills.isLoading || disasters.isLoading || skills.isError || disasters.isError} onPress={() => { setSaved(false); void handleSubmit((values) => save.mutate(values))(); }}>{save.isPending ? <ActivityIndicator color="#ffffff" accessibilityLabel="Saving selections" /> : <Text className="font-semibold text-white">Save selections</Text>}</Pressable></View>
    </> : null}
  </ScrollView></StyledSafeAreaView>;
}
