import { createApp } from "./app.js";
import { loadConfig } from "./config/env.js";

try {
  const config = loadConfig();
  const app = createApp(config);
  if (!config.clerkSecretKey || !config.clerkPublishableKey) {
    console.warn(JSON.stringify({
      level: "warn",
      event: "clerk_auth_not_configured",
      message: "Protected API routes require CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.",
    }));
  }
  if (!config.supabaseUrl) {
    console.warn(JSON.stringify({
      level: "warn",
      event: "supabase_not_configured",
      message: "Database operations require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    }));
  }
  app.listen(config.port, "0.0.0.0", () => {
    console.info(JSON.stringify({ level: "info", event: "server_started", port: config.port }));
  });
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(JSON.stringify({ level: "error", event: "server_start_failed", message }));
  process.exitCode = 1;
}
