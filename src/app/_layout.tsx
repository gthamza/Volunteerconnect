import "../global.css";
import { Stack } from "expo-router";
import { usePathname } from "expo-router";
import { useEffect } from "react";
import { ClerkProvider } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ThemeProvider } from "../features/theme/theme-provider";
import { ClerkTokenBridge } from "../services/supabase/clerk-token-bridge";
import { AppErrorBoundary } from "../components/app-error-boundary";
import { debugLog, debugWarn } from "../utils/debug-log";

function RouteDiagnostics() {
  const pathname = usePathname();
  useEffect(() => {
    debugLog("ROUTER", "Route changed", { pathname });
  }, [pathname]);
  return null;
}

const clerkPublishableKey: string = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!clerkPublishableKey) {
  debugWarn("BOOT", "Clerk publishable key is missing");
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Add your Clerk publishable key to .env.",
  );
}

debugLog("BOOT", "Root module loaded", {
  clerkKeyConfigured: Boolean(clerkPublishableKey),
  supabaseUrlConfigured: Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL),
  supabaseKeyConfigured: Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
});

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ClerkProvider publishableKey={clerkPublishableKey} tokenCache={tokenCache}>
        <ClerkTokenBridge>
          <AppErrorBoundary>
            <RouteDiagnostics />
            <Stack screenOptions={{ headerShown: false }} />
          </AppErrorBoundary>
        </ClerkTokenBridge>
      </ClerkProvider>
    </ThemeProvider>
  );
}
