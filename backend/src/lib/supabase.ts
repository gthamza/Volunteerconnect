import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { BackendConfig } from "../config/env.js";

/**
 * Creates a trusted server client. Service-role access bypasses RLS, so only
 * call this from backend code after the relevant authorization checks.
 */
export function createServerSupabaseClient(config: BackendConfig): SupabaseClient {
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.");
  }

  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}
