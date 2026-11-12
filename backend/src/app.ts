import { clerkClient, clerkMiddleware } from "@clerk/express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";
import cors from "cors";
import express from "express";
import type { BackendConfig } from "./config/env.js";
import { ApiError } from "./lib/api-error.js";
import { createServerSupabaseClient } from "./lib/supabase.js";
import { requireAuthenticatedUser } from "./middleware/authentication.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestLogger } from "./middleware/request-logger.js";
import { createHealthRouter } from "./routes/health.js";
import { createVolunteerRouter } from "./routes/volunteers.js";
import { createTaskRouter, type TaskAssignmentReadiness, type TaskOrganizationAuthorizer } from "./routes/tasks.js";

export function createApp(
  config: BackendConfig,
  options?: {
    supabaseClient?: SupabaseClient | null;
    testAuthenticationMiddleware?: RequestHandler;
    taskOrganizationAuthorizer?: TaskOrganizationAuthorizer;
    taskAssignmentReadiness?: TaskAssignmentReadiness;
  },
) {
  const app = express();
  const supabase: SupabaseClient | undefined = options && "supabaseClient" in options
    ? options.supabaseClient ?? undefined
    : config.supabaseUrl && config.supabaseServiceRoleKey
      ? createServerSupabaseClient(config)
      : undefined;
  const getOrganizationMemberships = async (organizationId: string) => {
    const memberships: Awaited<ReturnType<typeof clerkClient.organizations.getOrganizationMembershipList>>["data"] = [];
    let offset = 0;
    while (true) {
      const page = await clerkClient.organizations.getOrganizationMembershipList({ organizationId, limit: 100, offset });
      memberships.push(...page.data);
      if (memberships.length >= page.totalCount || page.data.length === 0) break;
      offset += page.data.length;
    }
    return memberships;
  };
  const getSupabase = () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    return supabase;
  };
  const authorizeTaskOrganization: TaskOrganizationAuthorizer = options?.taskOrganizationAuthorizer ?? (async ({ clerkOrganizationId, clerkRole }) => {
    // Task management is currently limited to Clerk organization admins.
    // Resolve the tenant from the server-side organizations table; never trust
    // an organization ID supplied by the client.
    if (clerkRole !== "org:admin") {
      throw new ApiError(403, "ORGANIZATION_PERMISSION_REQUIRED", "Only organization admins can manage organization tasks.");
    }
    const { data, error } = await getSupabase()
      .from("organizations")
      .select("id")
      .eq("clerk_organization_id", clerkOrganizationId)
      .maybeSingle();
    if (error) throw error;
    if (!data || typeof data.id !== "string") {
      throw new ApiError(403, "ORGANIZATION_NOT_CONFIGURED", "This organization is not configured in VolunteerConnect.");
    }
    return { id: data.id };
  });
  const volunteerRouter = createVolunteerRouter(getSupabase, requireAuthenticatedUser, getOrganizationMemberships);
  const taskRouter = createTaskRouter(
    getSupabase,
    requireAuthenticatedUser,
    getOrganizationMemberships,
    authorizeTaskOrganization,
    options?.taskAssignmentReadiness,
  );

  app.disable("x-powered-by");
  if (!options?.testAuthenticationMiddleware && config.clerkSecretKey && config.clerkPublishableKey) {
    app.use(clerkMiddleware({
      secretKey: config.clerkSecretKey,
      publishableKey: config.clerkPublishableKey,
    }));
  }
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

  if (options?.testAuthenticationMiddleware) {
    app.use(options.testAuthenticationMiddleware);
  }

  app.get("/auth/me", (req, res, next) => {
    if ((!config.clerkSecretKey || !config.clerkPublishableKey) && !options?.testAuthenticationMiddleware) {
      res.status(503).json({
        error: { code: "AUTHENTICATION_UNAVAILABLE", message: "Clerk authentication is not configured." },
      });
      return;
    }
    requireAuthenticatedUser(req, res, next);
  }, (_req, res) => {
    res.status(200).json({ userId: res.locals.userId });
  });

  app.use("/api/v1", (req, res, next) => {
    if ((!config.clerkSecretKey || !config.clerkPublishableKey) && !options?.testAuthenticationMiddleware) {
      res.status(503).json({
        error: { code: "AUTHENTICATION_UNAVAILABLE", message: "Clerk authentication is not configured." },
      });
      return;
    }
    if (!supabase) {
      res.status(503).json({
        error: { code: "DATABASE_UNAVAILABLE", message: "Database access is not configured." },
      });
      return;
    }
    next();
  }, volunteerRouter, taskRouter);

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: "NOT_FOUND", message: "The requested resource was not found." },
      ...(typeof res.locals.requestId === "string" ? { requestId: res.locals.requestId } : {}),
    });
  });
  app.use(errorHandler);

  return app;
}
