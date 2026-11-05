import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import { Redirect, useRouter, type Href } from "expo-router";
import { useAuth, useClerk, useOrganizationList, useUser } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { debugError, debugLog } from "../../utils/debug-log";
import { OrganizationWorkspace } from "../../features/organizations/organization-workspace";

const StyledSafeAreaView = styled(SafeAreaView);

function DestinationCard({
  eyebrow,
  title,
  description,
  icon,
  onPress,
  emphasis = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  emphasis?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`min-h-[118px] flex-row items-center gap-4 rounded-2xl border p-4 active:opacity-80 ${
        emphasis
          ? "border-forest bg-[#e8efe7] dark:border-[#496b54] dark:bg-[#202e26]"
          : "border-forest/10 bg-white dark:border-white/10 dark:bg-[#202e26]"
      }`}
      onPress={onPress}
    >
      <View className={`h-12 w-12 items-center justify-center rounded-2xl ${emphasis ? "bg-forest" : "bg-[#edf1eb] dark:bg-[#2b3a30]"}`}>
        <Text className={`text-xl font-bold ${emphasis ? "text-white" : "text-forest dark:text-[#b9ddc4]"}`}>{icon}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-[11px] font-bold uppercase tracking-wider text-muted dark:text-[#b4c2b8]">{eyebrow}</Text>
        <Text className="mt-1 text-base font-bold text-ink dark:text-[#eff4ee]">{title}</Text>
        <Text className="mt-1 text-sm leading-5 text-muted dark:text-[#b4c2b8]">{description}</Text>
      </View>
      <Text className="text-xl text-forest dark:text-[#b9ddc4]">›</Text>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isLoaded: organizationsLoaded, userMemberships, userInvitations } = useOrganizationList({
    userMemberships: true,
    userInvitations: { status: "pending" },
  });
  const [signOutError, setSignOutError] = useState<string | null>(null);
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

  const displayName = user?.firstName || "there";
  const activeOrganization = userMemberships.data?.find((membership) => membership.organization.id === orgId);
  const invitationCount = userInvitations.data?.length ?? 0;

  const handleSignOut = async () => {
    setSignOutError(null);
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/");
    } catch (error) {
      debugError("AUTH", "Sign out failed", error);
      setSignOutError("We couldn’t sign you out. Check your connection and try again.");
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-7 px-5 pb-8 pt-4"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <Image
              source={require("../../../assets/images/icon.png")}
              accessibilityLabel="VolunteerConnect logo"
              accessibilityRole="image"
              className="h-10 w-10"
              resizeMode="contain"
            />
            <View>
              <Text className="text-sm font-bold tracking-wide text-ink dark:text-[#eff4ee]">VolunteerConnect</Text>
              <Text className="mt-0.5 text-xs text-muted dark:text-[#b4c2b8]">Relief, coordinated.</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open volunteer profile"
            className="h-11 w-11 items-center justify-center rounded-full bg-forest"
            onPress={() => router.push("/profile")}
          >
            <Text className="text-sm font-bold text-white">
              {[user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join("").toUpperCase() || "VC"}
            </Text>
          </Pressable>
        </View>

        <View className="gap-2">
          <Text className="text-sm font-semibold text-forest dark:text-[#b9ddc4]">YOUR ACCOUNT</Text>
          <Text className="text-[30px] font-bold leading-9 tracking-tight text-ink dark:text-[#eff4ee]">
            Welcome, {displayName}
          </Text>
          <Text className="text-base leading-6 text-muted dark:text-[#b4c2b8]">
            Your volunteer and organization details, all in one place.
          </Text>
        </View>

        <View className="rounded-2xl bg-forest p-5">
          <Text className="text-xs font-bold uppercase tracking-wider text-[#d8e8d9]">Current workspace</Text>
          <Text className="mt-2 text-lg font-bold text-white">
            {orgId ? activeOrganization?.organization.name ?? "Organization workspace" : "Independent volunteer"}
          </Text>
          <Text className="mt-1 text-sm leading-5 text-[#dce8d8]">
            {orgId
              ? "Organization access is active for this session."
              : "You can use VolunteerConnect independently or join an organization."}
          </Text>
        </View>

        {orgId ? <OrganizationWorkspace /> : null}

        <View className="gap-3">
          <View className="mb-1">
            <Text className="text-xl font-bold text-ink dark:text-[#eff4ee]">Get started</Text>
            <Text className="mt-1 text-sm text-muted dark:text-[#b4c2b8]">Choose what you want to manage.</Text>
          </View>
          <DestinationCard
            eyebrow="Volunteer details"
            title="My profile"
            description="Review your skills, disaster types, and local knowledge."
            icon="◎"
            emphasis
            onPress={() => router.push("/profile")}
          />
          <DestinationCard
            eyebrow="Team access"
            title="Organizations"
            description={invitationCount > 0 ? `${invitationCount} pending invitation${invitationCount === 1 ? "" : "s"}; manage your workspace access.` : "View memberships, invitations, or create a workspace."}
            icon="⌂"
            onPress={() => router.push("/organization")}
          />
          {orgId ? <>
            <DestinationCard eyebrow="Organization details" title="Organization profile" description="View your active Clerk organization and role." icon="⌂" onPress={() => router.push("/organization-profile" as Href)} />
            <DestinationCard eyebrow="Team management" title="Organization volunteers" description="View volunteer profiles for members of this organization." icon="◎" onPress={() => router.push("/organization-volunteers" as Href)} />
          </> : null}
          <DestinationCard
            eyebrow="App preferences"
            title="Settings"
            description="Choose light, dark, or system appearance."
            icon="◐"
            onPress={() => router.push("/settings")}
          />
        </View>

        {!organizationsLoaded ? <ActivityIndicator accessibilityLabel="Loading organization access" /> : null}

        <View className="items-center gap-2 border-t border-forest/10 pt-5 dark:border-white/10">
          {signOutError ? <Text accessibilityRole="alert" className="text-center text-sm text-red-700 dark:text-red-300">{signOutError}</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSigningOut }}
            className="min-h-11 flex-row items-center justify-center gap-2 px-4"
            disabled={isSigningOut}
            onPress={() => void handleSignOut()}
          >
            {isSigningOut ? <ActivityIndicator accessibilityLabel="Signing out" /> : null}
            <Text className="font-semibold text-muted dark:text-[#b4c2b8]">Sign out</Text>
          </Pressable>
          <Text className="text-xs text-muted dark:text-[#839187]">Flood and earthquake relief coordination</Text>
        </View>
      </ScrollView>
    </StyledSafeAreaView>
  );
}
