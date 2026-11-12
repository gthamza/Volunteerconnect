import { Router, type RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationMembership } from "@clerk/express";
import { ApiError } from "../lib/api-error.js";
import { requireAuthenticatedUser } from "../middleware/authentication.js";
import { createTask, getOrganizationTask, listOrganizationTasks, updateOrganizationTask, updateOrganizationTaskStatus } from "../features/tasks/service.js";
import { createTaskSchema, taskIdSchema, taskStatusSchema, updateTaskSchema } from "../features/tasks/schemas.js";

export type TaskOrganizationContext = { userId: string; clerkOrganizationId: string; clerkRole: string };
/** Must check the approved task-management role and registered-organization authorization. */
export type TaskOrganizationAuthorizer = (context: TaskOrganizationContext) => Promise<{ id: string }>;
/** Must be supplied by the later matching/response workflow before Open → Assigned is enabled. */
export type TaskAssignmentReadiness = (context: { organizationId: string; taskId: string }) => Promise<boolean>;
export type GetTaskOrganizationMemberships = (organizationId: string) => Promise<OrganizationMembership[]>;

const validate = (schema: { safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } }, source: "body" | "params"): RequestHandler => (req, res, next) => {
  const parsed = schema.safeParse(req[source]);
  if (!parsed.success) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "The request contains invalid data.", details: parsed.error?.issues },
    });
    return;
  }
  res.locals[source === "params" ? "validatedParams" : "validatedBody"] = parsed.data;
  next();
};

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
}

export function createTaskRouter(
  getSupabase: () => SupabaseClient,
  authenticate: RequestHandler = requireAuthenticatedUser,
  getOrganizationMemberships?: GetTaskOrganizationMemberships,
  authorizeTaskOrganization?: TaskOrganizationAuthorizer,
  taskAssignmentReadiness?: TaskAssignmentReadiness,
) {
  const router = Router();

  const authorize = async (res: Parameters<RequestHandler>[1]) => {
    const userId = res.locals.userId;
    const clerkOrganizationId = res.locals.organizationId;
    const clerkRole = res.locals.organizationRole;
    if (typeof userId !== "string" || typeof clerkOrganizationId !== "string" || typeof clerkRole !== "string") {
      throw new ApiError(403, "ORGANIZATION_MEMBERSHIP_REQUIRED", "Select an organization where you are an active member.");
    }
    if (!getOrganizationMemberships) {
      throw new ApiError(503, "ORGANIZATION_MEMBERSHIP_UNAVAILABLE", "Organization membership could not be verified.");
    }
    const memberships = await getOrganizationMemberships(clerkOrganizationId);
    const currentMembership = memberships.find((membership) => membership.publicUserData?.userId === userId);
    if (!currentMembership || currentMembership.role !== clerkRole) {
      throw new ApiError(403, "ORGANIZATION_MEMBERSHIP_REQUIRED", "You are not an active member of this organization.");
    }
    if (!authorizeTaskOrganization) {
      throw new ApiError(503, "TASK_AUTHORIZATION_UNAVAILABLE", "Organization task authorization is not configured.");
    }
    return authorizeTaskOrganization({ userId, clerkOrganizationId, clerkRole: currentMembership.role });
  };

  router.post("/tasks", authenticate, validate(createTaskSchema, "body"), asyncRoute(async (_req, res) => {
    const organization = await authorize(res);
    const task = await createTask(getSupabase(), organization.id, res.locals.validatedBody as ReturnType<typeof createTaskSchema.parse>);
    res.status(201).json({ data: task });
  }));

  router.get("/tasks", authenticate, asyncRoute(async (_req, res) => {
    const organization = await authorize(res);
    res.status(200).json({ data: await listOrganizationTasks(getSupabase(), organization.id) });
  }));

  router.get("/tasks/:id", authenticate, validate(taskIdSchema, "params"), asyncRoute(async (_req, res) => {
    const organization = await authorize(res);
    const { id } = res.locals.validatedParams as { id: string };
    res.status(200).json({ data: await getOrganizationTask(getSupabase(), organization.id, id) });
  }));

  router.patch("/tasks/:id", authenticate, validate(taskIdSchema, "params"), validate(updateTaskSchema, "body"), asyncRoute(async (_req, res) => {
    const organization = await authorize(res);
    const { id } = res.locals.validatedParams as { id: string };
    // Strict Zod schema excludes organization ownership and status changes.
    const task = await updateOrganizationTask(getSupabase(), organization.id, id, res.locals.validatedBody as ReturnType<typeof updateTaskSchema.parse>);
    res.status(200).json({ data: task });
  }));

  router.patch("/tasks/:id/status", authenticate, validate(taskIdSchema, "params"), validate(taskStatusSchema, "body"), asyncRoute(async (_req, res) => {
    const organization = await authorize(res);
    const { id } = res.locals.validatedParams as { id: string };
    const input = res.locals.validatedBody as ReturnType<typeof taskStatusSchema.parse>;
    if (input.status === "Assigned") {
      // Resolve ownership before asking about assignment readiness; do not let
      // another organization probe a task's later-phase readiness state.
      await getOrganizationTask(getSupabase(), organization.id, id);
      const ready = taskAssignmentReadiness
        ? await taskAssignmentReadiness({ organizationId: organization.id, taskId: id })
        : false;
      if (!ready) {
        throw new ApiError(409, "TASK_ASSIGNMENT_NOT_READY", "The task cannot be assigned until the matching report and volunteer or organization responses have been reviewed.");
      }
    }
    const task = await updateOrganizationTaskStatus(getSupabase(), organization.id, id, input);
    res.status(200).json({ data: task });
  }));

  return router;
}
