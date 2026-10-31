import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useAuth, useOrganizationList } from "@clerk/expo";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { debugError, debugLog } from "../../utils/debug-log";
import { isOrganizationNameValid } from "../../features/organizations/validation";

const StyledSafeAreaView = styled(SafeAreaView);

export default function OrganizationAccessScreen() {
  const router = useRouter();
  const { isLoaded, isSignedIn, orgId } = useAuth();
  const {
    isLoaded: organizationsLoaded,
    createOrganization,
    setActive,
    userMemberships,
    userInvitations,
  } = useOrganizationList({
    userMemberships: true,
    userInvitations: { status: "pending" },
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState("");

  useEffect(() => {
    debugLog("ORG-ACCESS", "Organization access screen state", {
      authLoaded: isLoaded,
      signedIn: isSignedIn,
      organizationsLoaded,
      membershipCount: userMemberships.data?.length ?? null,
      invitationCount: userInvitations.data?.length ?? null,
      hasActiveOrganization: Boolean(orgId),
    });
  }, [isLoaded, isSignedIn, organizationsLoaded, userMemberships.data, userInvitations.data, orgId]);

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas dark:bg-[#111b16]">
        <ActivityIndicator accessibilityLabel="Loading your account" />
      </View>
    );
  }
  if (!isSignedIn) return <Redirect href="/" />;

  const selectOrganization = async (membershipId: string, organizationId: string) => {
    setBusyId(membershipId);
    setError(null);
    setMessage(null);
    try {
      if (!setActive) throw new Error("Organization selection is not ready");
      await setActive({ organization: organizationId });
      debugLog("ORG-ACCESS", "Organization selected");
      router.replace("/home");
    } catch (actionError) {
      debugError("ORG-ACCESS", "Could not select organization", actionError);
      setError("We couldn’t open that organization. Check your membership and try again.");
    } finally {
      setBusyId(null);
    }
  };

  const acceptInvitation = async (invitationId: string) => {
    setBusyId(invitationId);
    setError(null);
    setMessage(null);
    try {
      const invitation = userInvitations.data?.find((item) => item.id === invitationId);
      if (!invitation) throw new Error("Invitation is no longer available");
      await invitation.accept();
      await userMemberships.revalidate?.();
      await userInvitations.revalidate?.();
      debugLog("ORG-ACCESS", "Organization invitation accepted");
      setMessage("Invitation accepted. Select the organization below to open its workspace.");
    } catch (actionError) {
      debugError("ORG-ACCESS", "Could not accept organization invitation", actionError);
      setError("We couldn’t accept that invitation. It may have expired; refresh and try again.");
    } finally {
      setBusyId(null);
    }
  };

  const createOrganizationWorkspace = async () => {
    const name = organizationName.trim();
    if (!isOrganizationNameValid(name)) {
      setError("Enter your organization’s name.");
      setMessage(null);
      return;
    }
    setBusyId("create-organization");
    setError(null);
    setMessage(null);
    try {
      if (!createOrganization || !setActive) {
        throw new Error("Organization setup is not available for this Clerk session");
      }
      const organization = await createOrganization({ name });
      await setActive({ organization: organization.id });
      debugLog("ORG-ACCESS", "Organization workspace created and selected");
      router.replace("/home");
    } catch (actionError) {
      debugError("ORG-ACCESS", "Could not create organization workspace", actionError);
      setError("We couldn’t create the organization workspace. Check that Clerk Organizations are enabled and try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6">
        <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.replace("/home")}>
          <Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Home</Text>
        </Pressable>

        <View>
          <Text className="text-3xl font-bold text-ink dark:text-[#eff4ee]">Organization access</Text>
          <Text className="mt-2 text-sm leading-5 text-muted dark:text-[#b4c2b8]">
            Organization access uses your Clerk account. Choose a workspace where you are a member, or accept an invitation from its administrator.
          </Text>
        </View>

        <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
          <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Register your organization</Text>
          <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">
            Create an organization workspace in VolunteerConnect. You’ll be its administrator and can invite colleagues from the workspace.
          </Text>
          <TextInput
            accessibilityLabel="Organization name"
            autoCapitalize="words"
            maxLength={100}
            onChangeText={setOrganizationName}
            placeholder="Organization name"
            placeholderTextColor="#7b897f"
            returnKeyType="done"
            value={organizationName}
            className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]"
          />
          <Text className="text-xs leading-5 text-muted dark:text-[#b4c2b8]">
            This creates a Clerk workspace only. It does not verify that the organization is officially registered.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: busyId !== null }}
            className="min-h-12 items-center justify-center rounded-xl bg-forest px-4 py-3"
            disabled={busyId !== null || !organizationsLoaded || !createOrganization}
            onPress={() => void createOrganizationWorkspace()}
          >
            {busyId === "create-organization" ? <ActivityIndicator color="#ffffff" /> : (
              <Text className="font-semibold text-white">Create organization workspace</Text>
            )}
          </Pressable>
        </View>

        {!organizationsLoaded ? (
          <View className="items-start rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <ActivityIndicator accessibilityLabel="Loading organizations and invitations" />
          </View>
        ) : (
          <>
            <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
              <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Your organizations</Text>
              {userMemberships.data?.length ? userMemberships.data.map((membership) => {
                const active = membership.organization.id === orgId;
                return (
                  <Pressable
                    key={membership.id}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: active || busyId === membership.id, selected: active }}
                    className={`min-h-14 flex-row items-center justify-between rounded-xl border px-4 py-3 ${active ? "border-forest bg-[#e4ebe2] dark:bg-[#26372d]" : "border-forest/15 dark:border-white/15"}`}
                    disabled={active || busyId !== null}
                    onPress={() => void selectOrganization(membership.id, membership.organization.id)}
                  >
                    <View className="flex-1">
                      <Text className="font-semibold text-ink dark:text-[#eff4ee]">{membership.organization.name}</Text>
                      <Text className="mt-1 text-xs text-muted dark:text-[#b4c2b8]">{active ? "Active workspace" : "Tap to open workspace"}</Text>
                    </View>
                    {busyId === membership.id ? <ActivityIndicator /> : (
                      <Text className="font-semibold text-forest dark:text-[#b9ddc4]">{active ? "Active" : "Open"}</Text>
                    )}
                  </Pressable>
                );
              }) : (
                <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">
                  This account has no organization memberships yet. Ask your organization administrator to invite this Clerk account. You can still use VolunteerConnect independently.
                </Text>
              )}
            </View>

            <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
              <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Pending invitations</Text>
              {userInvitations.data?.length ? userInvitations.data.map((invitation) => (
                <View key={invitation.id} className="rounded-xl border border-forest/15 p-4 dark:border-white/15">
                  <Text className="font-semibold text-ink dark:text-[#eff4ee]">{invitation.publicOrganizationData.name}</Text>
                  <Pressable
                    accessibilityRole="button"
                    className="mt-3 min-h-11 items-center justify-center rounded-lg bg-forest px-4 py-2"
                    disabled={busyId !== null}
                    onPress={() => void acceptInvitation(invitation.id)}
                  >
                    {busyId === invitation.id ? <ActivityIndicator color="#ffffff" /> : (
                      <Text className="font-semibold text-white">Accept invitation</Text>
                    )}
                  </Pressable>
                </View>
              )) : (
                <Text className="text-sm text-muted dark:text-[#b4c2b8]">No pending organization invitations.</Text>
              )}
            </View>
          </>
        )}

        {message ? <Text accessibilityRole="alert" className="text-sm text-forest dark:text-[#b9ddc4]">{message}</Text> : null}
        {error ? <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">{error}</Text> : null}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
