import { ActivityIndicator, View } from "react-native";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useEffect } from "react";
import { debugLog } from "../../utils/debug-log";

export default function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    debugLog("ROUTER", "Protected layout auth state", { isLoaded, isSignedIn });
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-[#111b16]">
        <ActivityIndicator accessibilityLabel="Loading your session" />
      </View>
    );
  }

  if (!isSignedIn) {
    debugLog("ROUTER", "Redirecting signed-out user from protected routes");
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
