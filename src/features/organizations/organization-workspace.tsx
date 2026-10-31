import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { useAuth, useOrganization } from "@clerk/expo";
import { useEffect } from "react";
import { debugError, debugLog } from "../../utils/debug-log";
import { isEmailAddressValid } from "./validation";

const organizationData = {
  memberships: { pageSize: 20 },
  invitations: { pageSize: 20 },
};

export function OrganizationWorkspace() {
  const { orgId, orgRole } = useAuth();
  const { isLoaded, organization, memberships, invitations } = useOrganization(organizationData);
  const [email, setEmail] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = orgRole === "org:admin";

  useEffect(() => {
    debugLog("ORG", "Organization workspace state", {
      organizationLoaded: isLoaded,
      hasActiveOrganization: Boolean(orgId),
      organizationAvailable: Boolean(organization),
      isAdmin,
      memberCount: memberships?.data?.length ?? null,
      pendingInvitationCount: invitations?.data?.length ?? null,
    });
  }, [isLoaded, orgId, organization, isAdmin, memberships?.data, invitations?.data]);

  const perform = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id);
    setError(null);
    setMessage(null);
    try {
      await action();
      debugLog("ORG", "Organization action succeeded", { action: id });
      setMessage(success);
    } catch (error) {
      debugError("ORG", "Organization action failed", error);
      setError("We couldn’t update this organization. Check your access and try again.");
    } finally {
      setBusyId(null);
    }
  };

  const inviteMember = async () => {
    const normalizedEmail = email.trim();
    if (!isEmailAddressValid(normalizedEmail)) {
      setError("Enter a valid email address.");
      setMessage(null);
      return;
    }
    if (!organization) return;

    await perform("invite", async () => {
      await organization.inviteMember({ emailAddress: normalizedEmail, role: "org:member" });
      await invitations?.revalidate?.();
      setEmail("");
    }, "Invitation sent.");
  };

  if (!orgId) {
    return (
      <View className="rounded-2xl bg-white p-5 dark:bg-[#202e26]">
        <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Organization workspace</Text>
        <Text className="mt-2 text-sm leading-5 text-muted dark:text-[#b4c2b8]">
          You’re using VolunteerConnect independently. Your account does not need an organization.
        </Text>
      </View>
    );
  }

  if (!isLoaded) {
    return (
      <View className="items-start rounded-2xl bg-white p-5 dark:bg-[#202e26]">
        <ActivityIndicator accessibilityLabel="Loading organization workspace" />
      </View>
    );
  }

  if (!organization) {
    return (
      <View className="rounded-2xl bg-white p-5 dark:bg-[#202e26]">
        <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">
          Organization details could not be loaded. Try switching organizations again.
        </Text>
      </View>
    );
  }

  return (
    <View className="gap-4 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
      <View>
        <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Organization workspace</Text>
        <Text className="mt-1 text-base font-semibold text-forest dark:text-[#b9ddc4]">
          {organization.name}
        </Text>
        <Text className="mt-1 text-sm text-muted dark:text-[#b4c2b8]">
          Your role: {orgRole === "org:admin" ? "Administrator" : "Member"}
        </Text>
        <Text className="mt-2 text-xs leading-5 text-muted dark:text-[#b4c2b8]">
          Official registration status has not been verified by VolunteerConnect. A Clerk workspace confirms membership only.
        </Text>
      </View>

      <View className="gap-2">
        <Text className="font-semibold text-ink dark:text-[#eff4ee]">Members</Text>
        {memberships?.isLoading ? <ActivityIndicator accessibilityLabel="Loading members" /> : null}
        {memberships?.data?.length ? memberships.data.map((membership) => (
          <View key={membership.id} className="rounded-xl border border-forest/15 px-4 py-3 dark:border-white/15">
            <Text className="font-medium text-ink dark:text-[#eff4ee]">
              {membership.publicUserData?.firstName || membership.publicUserData?.identifier || "Organization member"}
            </Text>
            <Text className="mt-1 text-xs text-muted dark:text-[#b4c2b8]">{membership.role}</Text>
          </View>
        )) : !memberships?.isLoading ? (
          <Text className="text-sm text-muted dark:text-[#b4c2b8]">No member details are available.</Text>
        ) : null}
      </View>

      {isAdmin ? (
        <View className="gap-3 border-t border-forest/10 pt-4 dark:border-white/10">
          <Text className="font-semibold text-ink dark:text-[#eff4ee]">Invite an organization member</Text>
          <TextInput
            accessibilityLabel="Member email address"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="name@example.org"
            placeholderTextColor="#7b897f"
            value={email}
            className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]"
          />
          <Pressable
            accessibilityRole="button"
            className="min-h-12 items-center justify-center rounded-xl bg-forest px-4 py-3 active:opacity-80"
            disabled={busyId !== null}
            onPress={() => void inviteMember()}
          >
            {busyId === "invite" ? <ActivityIndicator color="#ffffff" /> : (
              <Text className="font-semibold text-white">Send invitation</Text>
            )}
          </Pressable>
          <Text className="text-xs leading-5 text-muted dark:text-[#b4c2b8]">
            New members receive the standard organization member role. Only administrators can invite or revoke invitations.
          </Text>
          <View className="gap-2">
            <Text className="font-semibold text-ink dark:text-[#eff4ee]">Pending invitations</Text>
            {invitations?.isLoading ? <ActivityIndicator accessibilityLabel="Loading pending invitations" /> : null}
            {invitations?.data?.length ? invitations.data.map((invitation) => (
              <View key={invitation.id} className="flex-row items-center justify-between gap-3 rounded-xl border border-forest/15 px-4 py-3 dark:border-white/15">
                <View className="flex-1">
                  <Text className="text-sm text-ink dark:text-[#eff4ee]">{invitation.emailAddress}</Text>
                  <Text className="mt-1 text-xs text-muted dark:text-[#b4c2b8]">{invitation.role}</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  className="min-h-11 justify-center px-2"
                  disabled={busyId !== null}
                  onPress={() => void perform(invitation.id, async () => {
                    await invitation.revoke();
                    await invitations?.revalidate?.();
                  }, "Invitation revoked.")}
                >
                  {busyId === invitation.id ? <ActivityIndicator /> : (
                    <Text className="font-semibold text-red-700 dark:text-red-300">Revoke</Text>
                  )}
                </Pressable>
              </View>
            )) : !invitations?.isLoading ? (
              <Text className="text-sm text-muted dark:text-[#b4c2b8]">No pending invitations.</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {message ? <Text accessibilityRole="alert" className="text-sm text-forest dark:text-[#b9ddc4]">{message}</Text> : null}
      {error ? <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">{error}</Text> : null}
    </View>
  );
}
