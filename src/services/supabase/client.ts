import { createClient } from "@supabase/supabase-js";
import { debugError, debugLog, debugWarn } from "../../utils/debug-log";

type ClerkTokenProvider = () => Promise<string | null>;

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let getClerkToken: ClerkTokenProvider | undefined;

/** Connects the active Clerk session to Supabase without enabling Supabase Auth. */
export function setSupabaseClerkTokenProvider(provider: ClerkTokenProvider | undefined) {
  getClerkToken = provider;
}

let supabaseClient: ReturnType<typeof createClient> | undefined;

/** Creates the app's Supabase client on first use, so missing DB credentials don't block sign-in. */
export function getSupabaseClient() {
  debugLog("SUPABASE", "Client requested", {
    urlConfigured: Boolean(supabaseUrl),
    keyConfigured: Boolean(supabaseKey),
    alreadyInitialized: Boolean(supabaseClient),
  });
  if (!supabaseUrl || !supabaseKey) {
    debugWarn("SUPABASE", "Client initialization blocked by missing public configuration", {
      urlConfigured: Boolean(supabaseUrl),
      keyConfigured: Boolean(supabaseKey),
    });
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. Add them to .env.",
    );
  }

  if (!supabaseClient) {
    try {
      supabaseClient = createClient(supabaseUrl, supabaseKey, {
        accessToken: async () => (getClerkToken ? getClerkToken() : null),
        auth: {
          autoRefreshToken: false,
          detectSessionInUrl: false,
          persistSession: false,
        },
      });
      debugLog("SUPABASE", "Client initialized");
    } catch (error) {
      debugError("SUPABASE", "Client initialization failed", error);
      throw error;
    }
  }

  return supabaseClient;
}
