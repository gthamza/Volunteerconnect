import { Pressable, Text, View } from "react-native";
import { useThemePreference, type ThemePreference } from "./theme-provider";
import { debugError } from "../../utils/debug-log";

export function ThemePicker() {
  const { preference, setPreference } = useThemePreference();

  return (
    <View className="flex-row gap-2">
      {(["system", "light", "dark"] as ThemePreference[]).map((option) => {
        const selected = preference === option;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            className={`min-h-11 flex-1 items-center justify-center rounded-xl border px-2 ${selected ? "border-forest bg-[#e4ebe2] dark:bg-[#26372d]" : "border-forest/15 dark:border-white/15"}`}
            onPress={() => void setPreference(option).catch((error: unknown) => {
              debugError("THEME", "Appearance preference action failed", error);
            })}
          >
            <Text className="text-sm font-semibold capitalize text-ink dark:text-[#eff4ee]">
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
