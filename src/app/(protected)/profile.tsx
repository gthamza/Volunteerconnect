import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, useOrganization, useUser } from "@clerk/expo";
import { useRouter, type Href } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { createVolunteerProfile, type VolunteerProfile } from "../../features/volunteers/api";
import { volunteerProfileKey, useVolunteerData } from "../../features/volunteers/queries";

const StyledSafeAreaView = styled(SafeAreaView);

function InfoRow({ label, value }: { label: string; value: string }) {
  return <View className="gap-1 border-b border-forest/10 pb-3 dark:border-white/10"><Text className="text-xs font-semibold uppercase tracking-wide text-muted dark:text-[#b4c2b8]">{label}</Text><Text className="text-base leading-6 text-ink dark:text-[#eff4ee]">{value}</Text></View>;
}

function ProfileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return <View className="gap-4 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">{title}</Text>{children}</View>;
}

export default function VolunteerProfileScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { organization } = useOrganization();
  const { user } = useUser();
  const queryClient = useQueryClient();
  const { profile } = useVolunteerData();
  const createProfile = useMutation({
    mutationFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      return createVolunteerProfile(token);
    },
    onSuccess: (data) => queryClient.setQueryData<VolunteerProfile>(volunteerProfileKey, data),
  });
  const email = user?.primaryEmailAddress?.emailAddress ?? "Email is not available in Clerk.";
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Name not provided in Clerk.";
  const errorMessage = profile.error instanceof Error ? profile.error.message : "Your profile could not be loaded.";
  const profileMissing = Boolean((profile.error as (Error & { status?: number }) | null)?.status === 404);

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6" showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.replace("/home")}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Home</Text></Pressable>
        <View className="flex-row items-start justify-between gap-3"><View className="flex-1"><Text className="text-3xl font-bold text-ink dark:text-[#eff4ee]">Volunteer profile</Text><Text className="mt-1 text-muted dark:text-[#b4c2b8]">Your information and support preferences</Text></View>
          {profile.data ? <View className="items-end gap-1"><Pressable accessibilityRole="button" className="min-h-11 justify-center rounded-xl bg-forest px-4" onPress={() => router.push("/edit-profile" as Href)}><Text className="font-semibold text-white">Edit profile</Text></Pressable><Pressable accessibilityRole="button" className="min-h-10 justify-center px-2" onPress={() => router.push("/location" as Href)}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Location & local knowledge</Text></Pressable><Pressable accessibilityRole="button" className="min-h-10 justify-center px-2" onPress={() => router.push("/skills" as Href)}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Skills & disasters</Text></Pressable></View> : null}
        </View>

        {profile.isLoading ? <View className="items-center gap-3 rounded-2xl bg-white p-8 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading volunteer profile" /><Text className="text-sm text-muted dark:text-[#b4c2b8]">Loading your profile…</Text></View> : null}

        {profile.isError ? <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{profileMissing ? "You have not created a volunteer profile yet." : errorMessage}</Text>
          {profileMissing ? <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-xl bg-forest px-4" disabled={createProfile.isPending} onPress={() => createProfile.mutate()}>{createProfile.isPending ? <ActivityIndicator color="#ffffff" /> : <Text className="font-semibold text-white">Create volunteer profile</Text>}</Pressable> : <Pressable accessibilityRole="button" className="min-h-11 self-start justify-center" onPress={() => void profile.refetch()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable>}
          {createProfile.isError ? <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">{createProfile.error.message}</Text> : null}
        </View> : null}

        {profile.data ? <>
          <ProfileCard title="Personal details">
            <InfoRow label="Name" value={name} />
            <InfoRow label="Contact email" value={email} />
            <InfoRow label="Phone" value="Not available through the current profile API." />
            <InfoRow label="Volunteer category" value="Not provided by the current profile API." />
          </ProfileCard>
          <ProfileCard title="Volunteer preferences">
            <InfoRow label="Skills" value={profile.data.skills.length ? profile.data.skills.map((item) => item.name).join(", ") : "No skills selected yet."} />
            <InfoRow label="Supported disaster types" value={profile.data.disasterTypes.length ? profile.data.disasterTypes.map((item) => item.name).join(", ") : "No disaster types selected yet."} />
            <InfoRow label="Location" value={profile.data.location ? "Location saved on your private volunteer profile." : "No location selected."} />
            <InfoRow label="Local-area knowledge" value={profile.data.localAreaKnowledge === null ? "Not answered" : profile.data.localAreaKnowledge ? "Yes" : "No"} />
          </ProfileCard>
          <ProfileCard title="Organization affiliation"><Text className="text-sm leading-6 text-muted dark:text-[#b4c2b8]">{organization?.name ?? "You do not have an active organization workspace."} Clerk organization membership determines your current organization affiliation.</Text></ProfileCard>
          {createProfile.isSuccess ? <Text accessibilityRole="alert" className="text-sm font-medium text-forest dark:text-[#b9ddc4]">Volunteer profile created.</Text> : null}
        </> : null}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
