import { Text, View } from "react-native";
import type { VolunteerLocation } from "./api";

export function LocationMap({
  location: _location,
  onSelect: _onSelect,
}: {
  location: VolunteerLocation | null;
  onSelect: (location: VolunteerLocation) => void;
}) {
  return (
    <View className="min-h-16 justify-center rounded-xl bg-[#e4ebe2] p-4 dark:bg-[#26372d]">
      <Text className="text-sm leading-5 text-ink dark:text-[#eff4ee]">
        The interactive map is available in the Android or iOS development build. You can enter latitude and longitude below instead.
      </Text>
    </View>
  );
}
