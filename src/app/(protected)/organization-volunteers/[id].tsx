import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useOrganizationVolunteer } from "../../../features/volunteers/queries";

const StyledSafeAreaView = styled(SafeAreaView);

export default function OrganizationVolunteerDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orgId } = useAuth();
  const volunteer = useOrganizationVolunteer(orgId ?? null, id ?? "");
  if (!orgId) return <Redirect href="/organization" />;
  const status = (volunteer.error as (Error & { status?: number }) | null)?.status;
  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6">
        <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.back()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Volunteers</Text></Pressable>
        {volunteer.isLoading ? <View className="items-center rounded-2xl bg-white p-8 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading volunteer details" /></View> : null}
        {volunteer.isError ? <View className="rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{status === 403 || status === 404 ? "This volunteer profile is not available in your organization." : volunteer.error instanceof Error ? volunteer.error.message : "Volunteer details could not be loaded."}</Text></View> : null}
        {volunteer.data ? <View className="gap-5 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><View><Text className="text-xs font-bold uppercase tracking-wider text-muted dark:text-[#b4c2b8]">Volunteer profile</Text><Text className="mt-2 text-2xl font-bold text-ink dark:text-[#eff4ee]">{volunteer.data.name}</Text></View><View className="gap-2"><Text className="font-semibold text-ink dark:text-[#eff4ee]">Disaster-related skills</Text><Text className="text-sm leading-6 text-muted dark:text-[#b4c2b8]">{volunteer.data.skills.length ? volunteer.data.skills.map((item) => item.name).join(", ") : "No skills selected."}</Text></View><View className="gap-2"><Text className="font-semibold text-ink dark:text-[#eff4ee]">Supported disaster types</Text><Text className="text-sm leading-6 text-muted dark:text-[#b4c2b8]">{volunteer.data.disasterTypes.length ? volunteer.data.disasterTypes.map((item) => item.name).join(", ") : "No disaster types selected."}</Text></View><View className="gap-2"><Text className="font-semibold text-ink dark:text-[#eff4ee]">Local-area knowledge</Text><Text className="text-sm leading-6 text-muted dark:text-[#b4c2b8]">{volunteer.data.localAreaKnowledge === null ? "Not answered" : volunteer.data.localAreaKnowledge ? "Yes" : "No"}</Text></View></View> : null}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
