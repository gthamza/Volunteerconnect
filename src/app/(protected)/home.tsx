import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth, useClerk, useOrganizationList, useUser } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { ThemePicker } from "../../features/theme/theme-picker";
import { OrganizationWorkspace } from "../../features/organizations/organization-workspace";
import { debugError, debugLog } from "../../utils/debug-log";

const StyledSafeAreaView = styled(SafeAreaView);

export default function HomeScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isLoaded: organizationsLoaded, setActive, userMemberships, userInvitations } =
    useOrganizationList({ userMemberships: true, userInvitations: { status: "pending" } });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    debugLog("HOME", "Home screen auth and organization state", {
      authLoaded: isLoaded,
      signedIn: isSignedIn,
      userLoaded: user !== undefined,
      organizationsLoaded,
      membershipCount: userMemberships.data?.length ?? null,
      invitationCount: userInvitations.data?.length ?? null,
      hasActiveOrganization: Boolean(orgId),
    });
  }, [isLoaded, isSignedIn, user, organizationsLoaded, userMemberships.data, userInvitations.data, orgId]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-[#111b16]">
        <ActivityIndicator accessibilityLabel="Loading session" />
      </View>
    );
  }

  if (!isSignedIn) return <Redirect href="/" />;

  const runOrganizationAction = async (id: string, action: () => Promise<void>) => {
    setError(null);
    setBusyId(id);
    try {
      await action();
      debugLog("HOME", "Organization action succeeded", { actionId: id });
    } catch (error) {
      debugError("HOME", "Organization action failed", error);
      setError("That organization action failed. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleSignOut = async () => {
    setError(null);
    setIsSigningOut(true);
    try {
      debugLog("AUTH", "Sign out started");
      await signOut();
      debugLog("AUTH", "Sign out completed");
      router.replace("/");
    } catch (error) {
      debugError("AUTH", "Sign out failed", error);
      setError("We couldn’t sign you out. Check your connection and try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  const displayName = user?.firstName || "there";
  const initials = [user?.firstName?.[0], user?.lastName?.[0]]
    .filter(Boolean)
    .join("")
    .toUpperCase();

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-5 py-5" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-forest dark:text-[#b9ddc4]">VolunteerConnect</Text>
            <Text className="mt-2 text-3xl font-bold tracking-[-0.7px] text-ink dark:text-[#eff4ee]">Welcome, {displayName}</Text>
            <Text className="mt-1 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Your relief coordination space</Text>
          </View>
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#e4ebe2] dark:bg-[#26372d]">
            <Text className="text-base font-bold text-forest dark:text-[#b9ddc4]">{initials || "VC"}</Text>
          </View>
        </View>

        <View className="overflow-hidden rounded-[28px] bg-forest p-6">
          <View className="absolute -right-8 -top-10 h-40 w-40 rounded-full border border-white/10" />
          <View className="absolute -right-1 top-5 h-24 w-24 rounded-full border border-white/10" />
          <Text className="text-xs font-semibold uppercase tracking-[1.4px] text-[#c9d9cb]">Ready when communities need you</Text>
          <Text className="mt-3 max-w-[280px] text-2xl font-bold leading-8 text-white">A stronger response starts with people working together.</Text>
          <Text className="mt-3 max-w-[280px] text-sm leading-5 text-[#dce8d8]">Use your workspace to manage your VolunteerConnect account and organization access.</Text>
        </View>

        <View className="flex-row gap-3">
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl border border-forest/20 bg-white px-3 dark:border-white/15 dark:bg-[#202e26]"
            onPress={() => router.push("/profile")}
          >
            <Text className="font-semibold text-forest dark:text-[#b9ddc4]">Profile</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            className="min-h-12 flex-1 items-center justify-center rounded-xl border border-forest/20 bg-white px-3 dark:border-white/15 dark:bg-[#202e26]"
            onPress={() => router.push("/settings")}
          >
            <Text className="font-semibold text-forest dark:text-[#b9ddc4]">Settings</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut }}
            className="min-h-12 items-center justify-center rounded-xl border border-red-700/20 bg-white px-4 dark:border-red-300/20 dark:bg-[#202e26]"
            disabled={isSigningOut}
            onPress={() => void handleSignOut()}
          >
            {isSigningOut ? <ActivityIndicator accessibilityLabel="Signing out" /> : (
              <Text className="font-semibold text-red-700 dark:text-red-300">Sign out</Text>
            )}
          </Pressable>
        </View>

        <View className="gap-1">
          <Text className="text-xl font-bold text-ink dark:text-[#eff4ee]">Your workspace</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Organization access and invitations appear here.</Text>
          <Pressable
            accessibilityRole="button"
            className="mt-2 min-h-11 self-start justify-center rounded-xl bg-forest px-4"
            onPress={() => router.push("/organization")}
          >
            <Text className="font-semibold text-white">Organization access</Text>
          </Pressable>
        </View>

        {!organizationsLoaded ? (
          <View className="items-start rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <ActivityIndicator accessibilityLabel="Loading organizations" />
          </View>
        ) : (
          <View className="gap-4">
            <OrganizationWorkspace />
            <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
              <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Switch workspace</Text>
              {orgId ? (
                <Pressable
                  accessibilityRole="button"
                  className="min-h-12 justify-center rounded-xl border border-forest/15 px-4 py-3 dark:border-white/15"
                  disabled={busyId === "personal-workspace"}
                  onPress={() => void runOrganizationAction("personal-workspace", async () => {
                    await setActive?.({ organization: null });
                  })}
                >
                  <Text className="font-medium text-ink dark:text-[#eff4ee]">
                    {busyId === "personal-workspace" ? "Switching…" : "Use personal workspace"}
                  </Text>
                </Pressable>
              ) : null}
              {userMemberships.data?.length ? userMemberships.data.map((membership) => {
                const active = membership.organization.id === orgId;
                return (
                  <Pressable
                    key={membership.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    className={`min-h-12 flex-row items-center justify-between rounded-xl border px-4 py-3 ${active ? "border-forest bg-[#e4ebe2] dark:bg-[#26372d]" : "border-forest/15 dark:border-white/15"}`}
                    disabled={active || busyId === membership.id}
                    onPress={() => void runOrganizationAction(membership.id, async () => {
                      await setActive?.({ organization: membership.organization.id });
                    })}
                  >
                    <Text className="font-medium text-ink dark:text-[#eff4ee]">{membership.organization.name}</Text>
                    {busyId === membership.id ? <ActivityIndicator /> : (
                      <Text className="text-sm text-forest dark:text-[#b9ddc4]">{active ? "Active" : "Switch"}</Text>
                    )}
                  </Pressable>
                );
              }) : (
                <Text className="text-sm text-muted dark:text-[#b4c2b8]">
                  No organization membership yet. Independent volunteer access is ready.
                </Text>
              )}
              {userInvitations.data?.length ? (
                <View className="mt-2 gap-3">
                  <Text className="font-semibold text-ink dark:text-[#eff4ee]">Organization invitations</Text>
                  {userInvitations.data.map((invitation) => (
                    <View key={invitation.id} className="rounded-xl border border-forest/15 p-4 dark:border-white/15">
                      <Text className="text-ink dark:text-[#eff4ee]">{invitation.publicOrganizationData.name}</Text>
                      <Pressable
                        accessibilityRole="button"
                        className="mt-3 min-h-11 items-center justify-center rounded-lg bg-forest px-4 py-2"
                        disabled={busyId === invitation.id}
                        onPress={() => void runOrganizationAction(invitation.id, async () => {
                          await invitation.accept();
                          await userMemberships.revalidate();
                          await userInvitations.revalidate();
                        })}
                      >
                        {busyId === invitation.id ? <ActivityIndicator color="#ffffff" /> : (
                          <Text className="font-semibold text-white">Accept invitation</Text>
                        )}
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        )}
          {error ? (
            <Text accessibilityRole="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">
              {error}
            </Text>
          ) : null}

        <View className="rounded-2xl bg-white p-5 dark:bg-[#202e26]">
          <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Appearance</Text>
          <Text className="mt-1 text-sm text-muted dark:text-[#b4c2b8]">
            Choose how VolunteerConnect looks on this device.
          </Text>
          <View className="mt-4">
            <ThemePicker />
          </View>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
