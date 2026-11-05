import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { styled } from "nativewind";
import { updateVolunteerProfile, type VolunteerLocation } from "../../features/volunteers/api";
import { volunteerProfileKey, useVolunteerData } from "../../features/volunteers/queries";
import { volunteerLocationSchema, type VolunteerLocationForm } from "../../features/volunteers/validation";
import { LocationMap } from "../../features/volunteers/location-map";

const StyledSafeAreaView = styled(SafeAreaView);

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: selected }} className={`min-h-12 flex-1 items-center justify-center rounded-xl border px-4 ${selected ? "border-forest bg-[#e4ebe2] dark:bg-[#26372d]" : "border-forest/20 dark:border-white/20"}`} onPress={onPress}>
      <Text className="font-semibold text-ink dark:text-[#eff4ee]">{label}</Text>
    </Pressable>
  );
}

export default function VolunteerLocationScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { profile } = useVolunteerData();
  const [gpsPending, setGpsPending] = useState(false);
  const [gpsMessage, setGpsMessage] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { control, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<VolunteerLocationForm>({
    resolver: zodResolver(volunteerLocationSchema),
    defaultValues: { latitude: "", longitude: "", localAreaKnowledge: undefined },
  });
  const latitude = watch("latitude");
  const longitude = watch("longitude");

  useEffect(() => {
    if (!profile.data) return;
    reset({
      latitude: profile.data.location ? String(profile.data.location.latitude) : "",
      longitude: profile.data.location ? String(profile.data.location.longitude) : "",
      localAreaKnowledge: profile.data.localAreaKnowledge ?? undefined,
    });
  }, [profile.data, reset]);

  const save = useMutation({
    mutationFn: async (values: VolunteerLocationForm) => {
      const token = await getToken();
      if (!token) throw new Error("Your session expired. Sign in again to continue.");
      const currentLocation = profile.data?.location ?? null;
      const hasLocation = Boolean(values.latitude.trim() && values.longitude.trim());
      const nextLocation: VolunteerLocation | null = hasLocation
        ? { latitude: Number(values.latitude), longitude: Number(values.longitude) }
        : null;
      const locationChanged = currentLocation === null
        ? nextLocation !== null
        : nextLocation === null || nextLocation.latitude !== currentLocation.latitude || nextLocation.longitude !== currentLocation.longitude;
      await updateVolunteerProfile(token, {
        localAreaKnowledge: values.localAreaKnowledge,
        ...(locationChanged ? { location: nextLocation } : {}),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: volunteerProfileKey });
      setSaved(true);
    },
    onError: () => setSaved(false),
  });

  const setLocation = (point: VolunteerLocation) => {
    setValue("latitude", String(point.latitude), { shouldValidate: true, shouldDirty: true });
    setValue("longitude", String(point.longitude), { shouldValidate: true, shouldDirty: true });
    setSaved(false);
    setGpsMessage(null);
  };

  const readCurrentLocation = async () => {
    setGpsPending(true);
    setGpsMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setGpsMessage("Location permission was not granted. You can still choose a point on the map or enter coordinates manually.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setGpsMessage("One-time current location selected. It is saved only when you press Save location.");
    } catch {
      setGpsMessage("We could not read the device location. Choose a point on the map or enter coordinates manually.");
    } finally {
      setGpsPending(false);
    }
  };

  const confirmLocationPermission = () => Alert.alert(
    "Use your current location?",
    "VolunteerConnect uses one foreground location reading to select your profile location for relief coordination. It does not track you in the background.",
    [
      { text: "Cancel", style: "cancel" },
      { text: "Continue", onPress: () => { void readCurrentLocation(); } },
    ],
  );

  const profileMissing = (profile.error as (Error & { status?: number }) | null)?.status === 404;
  const validationMessage = errors.latitude?.message ?? errors.longitude?.message;

  return (
    <StyledSafeAreaView className="flex-1 bg-canvas dark:bg-[#111b16]">
      <ScrollView className="flex-1" contentContainerClassName="gap-5 px-6 py-6" keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => router.back()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">‹  Profile</Text></Pressable>
        <View><Text className="text-3xl font-bold text-ink dark:text-[#eff4ee]">Location & local knowledge</Text><Text className="mt-1 text-sm leading-5 text-muted dark:text-[#b4c2b8]">Choose one location for your volunteer profile and update your local-area knowledge answer.</Text></View>

        {profile.isLoading ? <View className="items-center rounded-2xl bg-white p-6 dark:bg-[#202e26]"><ActivityIndicator accessibilityLabel="Loading volunteer location" /><Text className="mt-3 text-sm text-muted dark:text-[#b4c2b8]">Loading your profile…</Text></View> : null}
        {profile.isError ? <View className="gap-3 rounded-2xl bg-white p-5 dark:bg-[#202e26]"><Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{profileMissing ? "Create a volunteer profile before adding a location." : profile.error.message}</Text><Pressable accessibilityRole="button" className="min-h-11 justify-center self-start" onPress={() => void profile.refetch()}><Text className="font-semibold text-forest dark:text-[#b9ddc4]">Try again</Text></Pressable></View> : null}

        {profile.data ? <>
          <View className="gap-4 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Choose a profile location</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Your exact point is visible to you on this screen and is stored on your volunteer profile. It is used for volunteer coordination. Select a point on the map, use a one-time GPS reading, or enter coordinates.</Text>
            <LocationMap location={latitude.trim() && longitude.trim() ? { latitude: Number(latitude), longitude: Number(longitude) } : null} onSelect={setLocation} />
            <Text className="text-xs leading-5 text-muted dark:text-[#b4c2b8]">Map data © OpenStreetMap contributors. Tap the map to choose a point.</Text>
            <Pressable accessibilityRole="button" className="min-h-12 items-center justify-center rounded-xl bg-forest px-4" disabled={gpsPending} onPress={confirmLocationPermission}>
              {gpsPending ? <ActivityIndicator color="#ffffff" accessibilityLabel="Reading current location" /> : <Text className="font-semibold text-white">Use my current location</Text>}
            </Pressable>
            {gpsMessage ? <Text accessibilityRole="alert" className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">{gpsMessage}</Text> : null}

            <View className="gap-3">
              <Text className="font-semibold text-ink dark:text-[#eff4ee]">Manual coordinates</Text>
              <Controller control={control} name="latitude" render={({ field: { value, onChange } }) => <TextInput accessibilityLabel="Latitude" keyboardType="decimal-pad" value={value} onChangeText={(next) => { onChange(next); setSaved(false); }} placeholder="Latitude (-90 to 90)" className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]" />} />
              <Controller control={control} name="longitude" render={({ field: { value, onChange } }) => <TextInput accessibilityLabel="Longitude" keyboardType="decimal-pad" value={value} onChangeText={(next) => { onChange(next); setSaved(false); }} placeholder="Longitude (-180 to 180)" className="min-h-12 rounded-xl border border-forest/20 px-4 text-base text-ink dark:border-white/20 dark:text-[#eff4ee]" />} />
              {validationMessage ? <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">{validationMessage}</Text> : null}
              {profile.data.location ? <Pressable accessibilityRole="button" className="min-h-10 self-start justify-center" onPress={() => { setValue("latitude", "", { shouldValidate: true, shouldDirty: true }); setValue("longitude", "", { shouldValidate: true, shouldDirty: true }); setSaved(false); }}><Text className="font-semibold text-red-700 dark:text-red-300">Remove saved location</Text></Pressable> : null}
            </View>
          </View>

          <View className="gap-4 rounded-2xl bg-white p-5 dark:bg-[#202e26]">
            <Text className="text-lg font-bold text-ink dark:text-[#eff4ee]">Local-area knowledge</Text>
            <Text className="text-sm leading-5 text-muted dark:text-[#b4c2b8]">Do you have local-area knowledge?</Text>
            <Controller control={control} name="localAreaKnowledge" render={({ field: { value, onChange } }) => <View accessibilityRole="radiogroup" className="flex-row gap-3"><Choice label="Yes" selected={value === true} onPress={() => { onChange(true); setSaved(false); }} /><Choice label="No" selected={value === false} onPress={() => { onChange(false); setSaved(false); }} /></View>} />
            {errors.localAreaKnowledge ? <Text accessibilityRole="alert" className="text-sm text-red-700 dark:text-red-300">{errors.localAreaKnowledge.message}</Text> : null}
          </View>

          {save.isError ? <Text accessibilityRole="alert" className="text-sm leading-5 text-red-700 dark:text-red-300">{save.error.message} Your profile was not confirmed as saved. Review it and try again.</Text> : null}
          {saved ? <Text accessibilityRole="alert" className="text-sm font-semibold text-forest dark:text-[#b9ddc4]">Your location and local-area answer have been saved.</Text> : null}
          <View className="flex-row gap-3 pb-4"><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl border border-forest/20 dark:border-white/20" disabled={save.isPending} onPress={() => router.back()}><Text className="font-semibold text-ink dark:text-[#eff4ee]">Cancel</Text></Pressable><Pressable accessibilityRole="button" className="min-h-12 flex-1 items-center justify-center rounded-xl bg-forest px-4" disabled={save.isPending} onPress={() => { setSaved(false); void handleSubmit((values) => save.mutate(values))(); }}>{save.isPending ? <ActivityIndicator color="#ffffff" accessibilityLabel="Saving profile location" /> : <Text className="font-semibold text-white">Save location</Text>}</Pressable></View>
        </> : null}
      </ScrollView>
    </StyledSafeAreaView>
  );
}
