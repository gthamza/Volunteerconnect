import Constants, { ExecutionEnvironment } from "expo-constants";
import { Text, View } from "react-native";
import type { VolunteerLocation } from "./api";

const PAKISTAN_CENTER: [number, number] = [69.3451, 30.3753];
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function LocationMap({
  location,
  onSelect,
}: {
  location: VolunteerLocation | null;
  onSelect: (location: VolunteerLocation) => void;
}) {
  // MapLibre uses native modules that are not included in Expo Go's binary.
  // Keep its module evaluation behind this check so Expo Go can still open the
  // location screen and use the manual coordinate fields.
  if (isExpoGo) {
    return (
      <View className="min-h-16 justify-center rounded-xl bg-[#e4ebe2] p-4 dark:bg-[#26372d]">
        <Text className="text-sm leading-5 text-ink dark:text-[#eff4ee]">
          The interactive map is available in the Android or iOS development build. You can enter latitude and longitude below instead.
        </Text>
      </View>
    );
  }

  const { Map, Marker } = require("@maplibre/maplibre-react-native") as typeof import("@maplibre/maplibre-react-native");
  const center: [number, number] = location
    ? [location.longitude, location.latitude]
    : PAKISTAN_CENTER;

  return (
    <Map
      key={`${center[0]}:${center[1]}`}
      mapStyle={OPENFREEMAP_STYLE}
      style={{ height: 280, width: "100%", borderRadius: 16 }}
      attribution
      logo={false}
      onPress={(event) => {
        const [longitude, latitude] = event.nativeEvent.lngLat;
        onSelect({ latitude, longitude });
      }}
    >
      {location ? (
        <Marker lngLat={[location.longitude, location.latitude]}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#276749", borderWidth: 3, borderColor: "#ffffff" }} />
        </Marker>
      ) : null}
    </Map>
  );
}
