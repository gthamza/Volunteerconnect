import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styled } from "nativewind";
import { Redirect } from "expo-router";
import { useAuth } from "@clerk/expo";
import { useHostedAuth } from "@clerk/expo/hosted-auth";
import { ThemePicker } from "../features/theme/theme-picker";
import { debugError, debugLog } from "../utils/debug-log";

type PostAuthRoute = "/home" | "/organization";

const StyledSafeAreaView = styled(SafeAreaView);

function ReliefMark() {
  return (
    <View
      accessibilityLabel="VolunteerConnect relief mark"
      accessibilityRole="image"
      className="h-11 w-11 items-center justify-center rounded-2xl bg-signal"
    >
      <View className="h-6 w-2 rounded-full bg-forest" />
      <View className="absolute h-2 w-6 rounded-full bg-forest" />
    </View>
  );
}

function ResponseMap() {
  return (
    <View
      accessibilityLabel="A network of nearby relief communities"
      accessibilityRole="image"
      className="relative mt-8 h-[218px] overflow-hidden rounded-[28px] bg-[#214c3c]"
    >
      <View className="absolute -right-8 -top-10 h-56 w-56 rounded-full border border-white/10" />
      <View className="absolute -right-1 top-[-12px] h-40 w-40 rounded-full border border-white/10" />
      <View className="absolute right-9 top-8 h-24 w-24 rounded-full border border-white/15" />
      <View className="absolute left-8 top-[105px] h-px w-[230px] rotate-[-24deg] bg-white/20" />
      <View className="absolute left-16 top-[62px] h-px w-[190px] rotate-[20deg] bg-white/15" />
      <View className="absolute left-[22%] top-[25%] h-3 w-3 rounded-full bg-signal" />
      <View className="absolute left-[56%] top-[58%] h-4 w-4 rounded-full border-[3px] border-signal bg-[#214c3c]" />
      <View className="absolute right-[18%] top-[24%] h-2.5 w-2.5 rounded-full bg-[#dce8d8]" />
      <View className="absolute bottom-5 left-5 right-5 flex-row items-end justify-between">
        <View className="max-w-[210px]">
          <Text className="text-xs font-semibold text-[#c9d9cb]">WHEN NEED RISES</Text>
          <Text className="mt-1 text-lg font-semibold leading-6 text-white">
            Local people make response stronger.
          </Text>
        </View>
        <View className="mb-1 h-10 w-10 items-center justify-center rounded-full border border-white/25">
          <View className="h-2.5 w-2.5 rounded-full bg-signal" />
        </View>
      </View>
    </View>
  );
}

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  const { startHostedAuth } = useHostedAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up" | null>(null);
  const [postAuthRoute, setPostAuthRoute] = useState<PostAuthRoute>("/home");

  useEffect(() => {
    debugLog("AUTH-ROUTE", "Landing auth state", { isLoaded, isSignedIn });
  }, [isLoaded, isSignedIn]);

  const openAuth = async (mode: "sign-in" | "sign-up", destination: PostAuthRoute = "/home") => {
    debugLog("AUTH", "Hosted auth starting", { mode, destination });
    setAuthError(null);
    setAuthMode(mode);
    setPostAuthRoute(destination);
    try {
      const { createdSessionId } = await startHostedAuth({
        mode,
        redirectUrl: "volunteerconnect://callback",
      });
      debugLog("AUTH", "Hosted auth finished", { sessionCreated: Boolean(createdSessionId) });
      if (!createdSessionId) {
        debugLog("AUTH", "Hosted auth ended without creating a session");
      }
    } catch (error) {
      debugError("AUTH", "Hosted auth failed", error);
      setPostAuthRoute("/home");
      setAuthError("We couldn’t open sign in. Check your connection and try again.");
    } finally {
      setAuthMode(null);
    }
  };

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-[#111b16]">
        <ActivityIndicator accessibilityLabel="Loading authentication" color="#1f5c46" />
      </View>
    );
  }

  if (isSignedIn) {
    debugLog("ROUTER", "Signed-in user redirected from landing", { destination: postAuthRoute });
    return <Redirect href={postAuthRoute} />;
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <StatusBar style="auto" />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-8 pt-3"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3">
          <ReliefMark />
          <View>
            <Text className="text-base font-bold tracking-[-0.3px] text-ink dark:text-[#eff4ee]">
              VolunteerConnect
            </Text>
            <Text className="mt-0.5 text-xs text-muted dark:text-[#b4c2b8]">
              Relief starts with people
            </Text>
          </View>
        </View>

        <View className="mt-6">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted dark:text-[#b4c2b8]">
            Appearance
          </Text>
          <ThemePicker />
        </View>

        <View className="mt-9">
          <Text className="max-w-sm text-[36px] font-bold leading-[42px] tracking-[-1px] text-ink dark:text-[#eff4ee]">
            Ready hands.{"\n"}Stronger communities.
          </Text>
          <Text className="mt-3 max-w-sm text-base leading-6 text-muted dark:text-[#b4c2b8]">
            A shared place for volunteers and relief organizations to coordinate when floods or earthquakes hit.
          </Text>
        </View>

        <ResponseMap />

        <View className="mt-6 flex-row items-center gap-2">
          <View className="h-2 w-2 rounded-full bg-signal" />
          <Text className="text-sm font-medium text-ink dark:text-[#eff4ee]">
            Built for flood and earthquake response
          </Text>
        </View>

        <View className="mt-6 gap-3">
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: authMode !== null }}
            className="min-h-14 items-center justify-center rounded-2xl bg-forest px-5 py-4 active:opacity-80"
            disabled={authMode !== null}
            onPress={() => void openAuth("sign-up")}
          >
            {authMode === "sign-up" ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">Create an account</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: authMode !== null }}
            className="min-h-14 items-center justify-center rounded-2xl border border-forest/25 bg-white/50 px-5 py-4 dark:border-white/20 dark:bg-white/5 active:opacity-70"
            disabled={authMode !== null}
            onPress={() => void openAuth("sign-in")}
          >
            {authMode === "sign-in" ? (
              <ActivityIndicator color="#1f5c46" />
            ) : (
              <Text className="text-base font-semibold text-forest dark:text-[#eff4ee]">I already have an account</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: authMode !== null }}
            className="min-h-12 items-center justify-center rounded-xl px-4 py-3 active:opacity-70"
            disabled={authMode !== null}
            onPress={() => void openAuth("sign-in", "/organization")}
          >
            <Text className="font-semibold text-forest dark:text-[#b9ddc4]">Organization sign in</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: authMode !== null }}
            className="min-h-12 items-center justify-center rounded-xl px-4 py-3 active:opacity-70"
            disabled={authMode !== null}
            onPress={() => void openAuth("sign-up", "/organization")}
          >
            <Text className="font-semibold text-forest dark:text-[#b9ddc4]">Register an organization</Text>
          </Pressable>
          {authError ? (
            <Text accessibilityRole="alert" className="text-center text-sm leading-5 text-red-700 dark:text-red-300">
              {authError}
            </Text>
          ) : null}
        </View>

        <Text className="mt-5 px-3 text-center text-xs leading-5 text-muted dark:text-[#b4c2b8]">
          Use your Clerk account for either path. Organization members choose a workspace after sign in; independent volunteers can continue without one.
        </Text>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
