import { useEffect, type ReactNode } from "react";
import { useAuth } from "@clerk/expo";
import { setSupabaseClerkTokenProvider } from "./client";
import { summarizeClerkJwtClaims } from "./clerk-jwt-claims";
import { debugError, debugLog } from "../../utils/debug-log";

export function ClerkTokenBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, orgId } = useAuth();

  useEffect(() => {
    debugLog("SUPABASE", "Clerk token bridge state changed", {
      isLoaded,
      isSignedIn,
      hasActiveOrganization: Boolean(orgId),
    });

    if (__DEV__ && isLoaded && isSignedIn) {
      void getToken().then((token) => {
        debugLog(
          "SUPABASE",
          "Clerk JWT claim summary (payload only; no token or claim values logged)",
          token ? summarizeClerkJwtClaims(token) : { tokenAvailable: false },
        );
      }).catch((error) => {
        debugError("SUPABASE", "Clerk JWT claim summary failed", error);
      });
    }

    setSupabaseClerkTokenProvider(
      isLoaded && isSignedIn ? async () => {
        try {
          const token = await getToken();
          debugLog("SUPABASE", "Clerk token requested", { tokenAvailable: Boolean(token) });
          return token;
        } catch (error) {
          debugError("SUPABASE", "Clerk token request failed", error);
          throw error;
        }
      } : undefined,
    );

    return () => setSupabaseClerkTokenProvider(undefined);
  }, [getToken, isLoaded, isSignedIn, orgId]);

  return children;
}
