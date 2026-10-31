import * as SecureStore from "expo-secure-store";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";
import { Appearance } from "react-native";
import { debugError, debugLog } from "../../utils/debug-log";

export type ThemePreference = "system" | "light" | "dark";

type ThemeContextValue = {
  preference: ThemePreference;
  isReady: boolean;
  setPreference: (preference: ThemePreference) => Promise<void>;
};

const STORAGE_KEY = "volunteerconnect.theme-preference";
const ThemeContext = createContext<ThemeContextValue | null>(null);

export function isThemePreference(value: string | null): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void SecureStore.getItemAsync(STORAGE_KEY)
      .then((storedPreference) => {
        if (!mounted) return;
        debugLog("THEME", "Stored appearance preference loaded", { preferenceAvailable: isThemePreference(storedPreference) });
        if (isThemePreference(storedPreference)) {
          setPreferenceState(storedPreference);
          Appearance.setColorScheme(storedPreference === "system" ? "unspecified" : storedPreference);
        }
      })
      .catch((error) => {
        debugError("THEME", "Could not read stored appearance preference", error);
        // Keep the device appearance when the preference cannot be read.
      })
      .finally(() => {
        if (mounted) setIsReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const setPreference = useCallback(async (nextPreference: ThemePreference) => {
    debugLog("THEME", "Appearance preference changed", { preference: nextPreference });
    setPreferenceState(nextPreference);
    Appearance.setColorScheme(nextPreference === "system" ? "unspecified" : nextPreference);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, nextPreference);
      debugLog("THEME", "Appearance preference saved");
    } catch (error) {
      debugError("THEME", "Could not save appearance preference", error);
      throw error;
    }
  }, []);

  const value = useMemo(
    () => ({ preference, isReady, setPreference }),
    [preference, isReady, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemePreference() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useThemePreference must be used within ThemeProvider");
  return context;
}
