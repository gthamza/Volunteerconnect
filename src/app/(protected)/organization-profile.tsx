import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter, type Href } from "expo-router";
import { useAuth, useOrganization } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";

const StyledSafeAreaView = styled(SafeAreaView);

export default function OrganizationProfileScreen() {
  const router = useRouter();
  const { orgId, orgRole } = useAuth();
  const { isLoaded, organization } = useOrganization();

  if (!orgId) return <Redirect href="/organization" />;
  if (!isLoaded) return <View className="flex-1 items-center justify-center bg-canvas dark:bg-[#111b16]"><ActivityIndicator accessibilityLabel="Loading organization profile" /></View>;

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6">
        <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.replace("/home")}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Home</Text></Pressable>
        {!organization ? (
          <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="text-base leading-6 text-red-700 dark:text-red-300">Organization details are unavailable for the active Clerk workspace.</Text><Pressable onPress={() => router.replace("/organization")}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Switch organization</Text></Pressable></View>
        ) : (
          <View className="gap-5 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <View><Text className="text-xs font-bold uppercase tracking-wider text-muted dark:text-[#b4c2b8]">Organization profile</Text><Text className="mt-2 text-2xl font-bold text-ink dark:text-[#eff4ee]">{organization.name}</Text></View>
            <View className="gap-1 border-t border-forest/10 pt-4 dark:border-white/10"><Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-[#b4c2b8]">Your Clerk role</Text><Text className="text-base text-ink dark:text-[#eff4ee]">{orgRole === "org:admin" ? "Administrator" : orgRole === "org:member" ? "Member" : orgRole ?? "Organization member"}</Text></View>
            <Text className="text-sm leading-6 text-muted dark:text-[#b4c2b8]">Membership and role are provided by Clerk Organizations. Workspace membership does not indicate official organization registration status.</Text>
            <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-xl bg-forest px-4" onPress={() => router.push("/organization-volunteers" as Href)}><Text className="font-semibold text-white">Manage volunteers</Text></Pressable>
          </View>
        )}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
