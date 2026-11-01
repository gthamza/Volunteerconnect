import { clerkMiddleware } from "@clerk/express";
import type { SupabaseClient } from "@supabase/supabase-js";
import cors from "cors";
import express from "express";
import type { BackendConfig } from "./config/env.js";
import { createServerSupabaseClient } from "./lib/supabase.js";
import { requireAuthenticatedUser } from "./middleware/authentication.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { createHealthRouter } from "./routes/health.js";

export function createApp(
  config: BackendConfig,
  options?: { supabaseClient?: SupabaseClient | null },
) {
  const app = express();
  const supabase: SupabaseClient | undefined = options && "supabaseClient" in options
    ? options.supabaseClient ?? undefined
    : config.supabaseUrl && config.supabaseServiceRoleKey
      ? createServerSupabaseClient(config)
      : undefined;

  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(cors({
    origin(origin, callback) {
      if (
        !origin ||
        (config.nodeEnv !== "production" && config.corsOrigins.length === 0) ||
        config.corsOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  }));
  app.use(express.json({ limit: "100kb", type: "application/json" }));
  app.use(express.urlencoded({ extended: false, limit: "100kb", parameterLimit: 100 }));

  // Health is public and must remain useful if Clerk is misconfigured or unavailable.
  app.use("/health", createHealthRouter(supabase));

  if (config.clerkSecretKey) {
    app.use(clerkMiddleware({ secretKey: config.clerkSecretKey }));
  }

  app.get("/auth/me", (req, res, next) => {
    if (!config.clerkSecretKey) {
      res.status(503).json({
        error: { code: "AUTHENTICATION_UNAVAILABLE", message: "Clerk authentication is not configured." },
      });
      return;
    }
    requireAuthenticatedUser(req, res, next);
  }, (_req, res) => {
    res.status(200).json({ userId: res.locals.userId });
  });

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "The requested resource was not found." },
      ...(typeof res.locals.requestId === "string" ? { requestId: res.locals.requestId } : {}),
    });
  });
  app.use(errorHandler);

  return app;
}
