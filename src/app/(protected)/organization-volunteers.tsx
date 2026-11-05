import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter, type Href } from "expo-router";
import { useAuth } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { useOrganizationVolunteers } from "../../features/volunteers/queries";

const StyledSafeAreaView = styled(SafeAreaView);

export default function OrganizationVolunteersScreen() {
  const router = useRouter();
  const { orgId } = useAuth();
  const volunteers = useOrganizationVolunteers(orgId ?? null);
  if (!orgId) return <Redirect href="/organization" />;
  const unauthorized = (volunteers.error as (Error & { status?: number; code?: string }) | null)?.status === 403;
  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6">
        <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.replace("/organization-profile" as Href)}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Organization profile</Text></Pressable>
        <View><Text className="text-3xl font-bold text-ink dark:text-[#eff4ee]">Organization volunteers</Text><Text className="mt-2 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Only members of this active Clerk organization can view its volunteer profiles.</Text></View>
        {volunteers.isLoading ? <View className="items-center gap-3 rounded-2xl bg-white p-8 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading organization volunteers" /><Text className="text-sm text-muted dark:text-[#b4c2b8]">Loading volunteers…</Text></View> : null}
        {volunteers.isError ? <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{unauthorized ? "You do not have access to this organization’s volunteer records. Select an organization where you are a member." : volunteers.error instanceof Error ? volunteers.error.message : "Volunteer records could not be loaded."}</Text>{!unauthorized ? <Pressable accessibilityRole="button" className="min-h-11 self-start justify-center" onPress={() => void volunteers.refetch()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable> : null}</View> : null}
        {volunteers.isSuccess && volunteers.data.length === 0 ? <View className="rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-base font-semibold text-ink dark:text-[#eff4ee]">No volunteer profiles yet</Text><Text className="mt-2 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Clerk organization members with a VolunteerConnect profile will appear here.</Text></View> : null}
        {volunteers.data?.map((volunteer) => <Pressable key={volunteer.id} accessibilityRole="button" className="gap-2 rounded-2xl bg-white p-5 dark:bg-[#202e26]" onPress={() => router.push({ pathname: "/organization-volunteers/[id]", params: { id: volunteer.id } } as unknown as Href)}><View className="flex-row items-center justify-between"><Text className="flex-1 text-base font-bold text-ink dark:text-[#eff4ee]">{volunteer.name}</Text><Text className="text-xl text-forest dark:text-[#b9ddc4]">›</Text></View><Text className="text-sm text-muted dark:text-[#b4c2b8]">{volunteer.skills.length} skills · {volunteer.disasterTypes.length} supported disaster types</Text><Text className="text-xs text-muted dark:text-[#b4c2b8]">Organization role: {volunteer.role}</Text></Pressable>)}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
