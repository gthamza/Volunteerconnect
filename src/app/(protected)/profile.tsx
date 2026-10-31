import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { debugLog } from "../../utils/debug-log";

const StyledSafeAreaView = styled(SafeAreaView);

export default function ProfileScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  useEffect(() => {
    debugLog("PROFILE", "Profile screen auth state", { isLoaded, isSignedIn, userAvailable: Boolean(user) });
  }, [isLoaded, isSignedIn, user]);

  if (!isLoaded) {
    return <View className="flex-1 items-center justify-center bg-canvas dark:bg-[#111b16]"><ActivityIndicator accessibilityLabel="Loading profile" /></View>;
  }
  if (!isSignedIn) return <Redirect href="/" />;

  const email = user?.primaryEmailAddress?.emailAddress;
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6">
        <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.replace("/home")}>
          <Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Home</Text>
        </Pressable>
        <View>
          <Text className="text-3xl font-bold text-ink dark:text-[#eff4ee]">Profile</Text>
          <Text className="mt-1 text-muted dark:text-[#b4c2b8]">Your VolunteerConnect account</Text>
        </View>
        <View className="gap-4 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-[#b4c2b8]">Name</Text>
            <Text className="mt-1 text-base font-medium text-ink dark:text-[#eff4ee]">{name || "Name not provided"}</Text>
          </View>
          <View>
            <Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-[#b4c2b8]">Email</Text>
            <Text className="mt-1 text-base font-medium text-ink dark:text-[#eff4ee]">{email || "Email not available"}</Text>
          </View>
          <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">
            Profile and sign-in details are managed securely by Clerk.
          </Text>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
