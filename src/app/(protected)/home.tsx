import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
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
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Image
              source={require("../../../assets/images/icon.png")}
              accessibilityLabel="VolunteerConnect logo"
              accessibilityRole="image"
              className="h-12 w-12"
              resizeMode="contain"
            />
            <View>
              <Text className="text-sm font-bold tracking-wide text-ink dark:text-[#eff4ee]">VolunteerConnect</Text>
              <Text className="mt-0.5 text-xs text-muted dark:text-[#b4c2b8]">Relief, coordinated.</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Open profile" className="h-11 w-11 items-center justify-center rounded-full border border-forest/15 bg-white dark:border-white/15 dark:bg-[#202e26]" onPress={() => router.push("/profile")}>
            <Text className="text-sm font-bold text-forest dark:text-[#b9ddc4]">{initials || "VC"}</Text>
          </Pressable>
        </View>

        <View className="overflow-hidden rounded-[28px] bg-forest px-6 pb-6 pt-7">
          <View className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-white/10" />
          <View className="absolute -right-1 top-14 h-24 w-24 rounded-full border border-white/10" />
          <View className="mb-5 self-start rounded-full bg-white/10 px-3 py-1.5">
            <Text className="text-[11px] font-bold uppercase tracking-widest text-[#d8e8d9]">Your relief workspace</Text>
          </View>
          <Text className="text-[30px] font-bold leading-9 tracking-tight text-white">Welcome, {displayName}.</Text>
          <Text className="mt-3 max-w-[290px] text-sm leading-6 text-[#dce8d8]">Prepared people make a stronger response. Manage your account and organization access here.</Text>
          <View className="mt-6 h-px bg-white/15" />
          <View className="mt-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full bg-[#e6b34a]" />
              <Text className="text-xs font-medium text-white">{orgId ? "Organization workspace active" : "Independent account"}</Text>
            </View>
            <Text className="text-xs font-semibold text-[#d8e8d9]">Pakistan</Text>
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-end justify-between">
            <View>
              <Text className="text-xl font-bold text-ink dark:text-[#eff4ee]">Quick access</Text>
              <Text className="mt-1 text-sm text-muted dark:text-[#b4c2b8]">Manage your account and workspace</Text>
            </View>
          </View>
          <View className="flex-row gap-3">
            <Pressable accessibilityRole="button" className="min-h-[104px] flex-1 justify-between rounded-2xl border border-forest/10 bg-white p-4 dark:border-white/10 dark:bg-[#202e26]" onPress={() => router.push("/organization")}>
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#e4ebe2] dark:bg-[#26372d]"><Text className="font-bold text-forest dark:text-[#b9ddc4]">⌂</Text></View>
              <View><Text className="font-bold text-ink dark:text-[#eff4ee]">Organizations</Text><Text className="mt-0.5 text-xs text-muted dark:text-[#b4c2b8]">Membership & access</Text></View>
            </Pressable>
            <Pressable accessibilityRole="button" className="min-h-[104px] flex-1 justify-between rounded-2xl border border-forest/10 bg-white p-4 dark:border-white/10 dark:bg-[#202e26]" onPress={() => router.push("/settings")}>
              <View className="h-8 w-8 items-center justify-center rounded-xl bg-[#f4ecd9] dark:bg-[#3a3325]"><Text className="font-bold text-[#8a6722] dark:text-[#e6c980]">◐</Text></View>
              <View><Text className="font-bold text-ink dark:text-[#eff4ee]">Appearance</Text><Text className="mt-0.5 text-xs text-muted dark:text-[#b4c2b8]">Theme preferences</Text></View>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: isSigningOut }} className="min-h-12 flex-row items-center justify-between rounded-2xl border border-forest/10 bg-white px-4 dark:border-white/10 dark:bg-[#202e26]" disabled={isSigningOut} onPress={() => void handleSignOut()}>
            <Text className="font-semibold text-ink dark:text-[#eff4ee]">Sign out</Text>
            {isSigningOut ? <ActivityIndicator accessibilityLabel="Signing out" /> : <Text className="text-lg text-muted dark:text-[#b4c2b8]">›</Text>}
          </Pressable>
        </View>

        <View className="gap-1">
          <Text className="text-xl font-bold text-ink dark:text-[#eff4ee]">Workspace access</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Switch organizations, manage memberships, or continue independently.</Text>
          <Pressable
            accessibilityRole="button"
            className="mt-2 min-h-11 self-start justify-center rounded-xl bg-forest px-4"
            onPress={() => router.push("/organization")}
          >
            <Text className="font-semibold text-white">Manage organization access</Text>
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
