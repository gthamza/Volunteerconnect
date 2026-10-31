import { useEffect } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { ThemePicker } from "../../features/theme/theme-picker";
import { debugLog } from "../../utils/debug-log";

const StyledSafeAreaView = styled(SafeAreaView);

export default function SettingsScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    debugLog("SETTINGS", "Settings screen auth state", { isLoaded, isSignedIn });
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return <View className="flex-1 items-center justify-center bg-canvas dark:bg-[#111b16]"><ActivityIndicator accessibilityLabel="Loading settings" /></View>;
  }
  if (!isSignedIn) return <Redirect href="/" />;

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6">
        <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.replace("/home")}>
          <Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Home</Text>
        </Pressable>
        <View>
          <Text className="text-3xl font-bold text-ink dark:text-[#eff4ee]">Settings</Text>
          <Text className="mt-1 text-muted dark:text-[#b4c2b8]">Personalize your VolunteerConnect app</Text>
        </View>
        <View className="gap-4 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
          <View>
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Appearance</Text>
            <Text className="mt-1 text-sm leading-5 text-muted dark:text-[#b4c2b8]">
              Follow your device or choose a light or dark appearance.
            </Text>
          </View>
          <ThemePicker />
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
