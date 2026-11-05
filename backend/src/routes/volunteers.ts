import { Router, type RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationMembership } from "@clerk/express";
import { requireAuthenticatedUser } from "../middleware/authentication.js";
import {
  addDisasterTypesSchema,
  addSkillsSchema,
  associationIdSchema,
  createProfileSchema,
  updateProfileSchema,
} from "../features/volunteers/schemas.js";
import {
  addVolunteerDisasterTypes,
  addVolunteerSkills,
  createVolunteerProfile,
  listDisasterTypes,
  listSkills,
  readVolunteerProfile,
  removeVolunteerDisasterType,
  removeVolunteerSkill,
  updateVolunteerProfile,
  listOrganizationVolunteers,
  readOrganizationVolunteer,
} from "../features/volunteers/service.js";
import { VolunteerApiError } from "../features/volunteers/service.js";

const validate = (schema: { safeParse: (input: unknown) => { success: boolean; data?: unknown; error?: { issues: unknown[] } } }, source: "body" | "params"): RequestHandler => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "The request contains invalid data.", details: result.error?.issues },
    });
    return;
  }
  res.locals.validated = result.data;
  next();
};

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
}

export function createVolunteerRouter(
  getSupabase: () => SupabaseClient,
  authenticate: RequestHandler = requireAuthenticatedUser,
  getOrganizationMemberships?: (organizationId: string) => Promise<OrganizationMembership[]>,
) {
  const router = Router();
  const self: RequestHandler[] = [authenticate];

  router.post("/volunteers/me", ...self, validate(createProfileSchema, "body"), asyncRoute(async (_req, res) => {
    const profile = await createVolunteerProfile(getSupabase(), res.locals.userId as string);
    res.status(201).json({ data: profile });
  }));

  router.get("/volunteers/me", ...self, asyncRoute(async (_req, res) => {
    const profile = await readVolunteerProfile(getSupabase(), res.locals.userId as string);
    res.status(200).json({ data: profile });
  }));

  router.patch("/volunteers/me", ...self, validate(updateProfileSchema, "body"), asyncRoute(async (_req, res) => {
    const profile = await updateVolunteerProfile(getSupabase(), res.locals.userId as string, res.locals.validated as { localAreaKnowledge?: boolean });
    res.status(200).json({ data: profile });
  }));

  router.get("/volunteer-skills", ...self, asyncRoute(async (_req, res) => {
    res.status(200).json({ data: await listSkills(getSupabase()) });
  }));
  router.post("/volunteers/me/skills", ...self, validate(addSkillsSchema, "body"), asyncRoute(async (_req, res) => {
    const profile = await addVolunteerSkills(getSupabase(), res.locals.userId as string, res.locals.validated as { skillIds: string[] });
    res.status(200).json({ data: profile });
  }));
  router.delete("/volunteers/me/skills/:id", ...self, validate(associationIdSchema, "params"), asyncRoute(async (_req, res) => {
    const { id } = res.locals.validated as { id: string };
    res.status(200).json({ data: await removeVolunteerSkill(getSupabase(), res.locals.userId as string, id) });
  }));

  router.get("/disaster-types", ...self, asyncRoute(async (_req, res) => {
    res.status(200).json({ data: await listDisasterTypes(getSupabase()) });
  }));
  router.post("/volunteers/me/disaster-types", ...self, validate(addDisasterTypesSchema, "body"), asyncRoute(async (_req, res) => {
    const profile = await addVolunteerDisasterTypes(getSupabase(), res.locals.userId as string, res.locals.validated as { disasterTypeIds: string[] });
    res.status(200).json({ data: profile });
  }));
  router.delete("/volunteers/me/disaster-types/:id", ...self, validate(associationIdSchema, "params"), asyncRoute(async (_req, res) => {
    const { id } = res.locals.validated as { id: string };
    res.status(200).json({ data: await removeVolunteerDisasterType(getSupabase(), res.locals.userId as string, id) });
  }));

  const requireOrganization = (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) => {
    const organizationId = res.locals.organizationId;
    const role = res.locals.organizationRole;
    if (typeof organizationId !== "string" || typeof role !== "string") {
      throw new VolunteerApiError(403, "ORGANIZATION_MEMBERSHIP_REQUIRED", "Select an organization where you are a member.");
    }
    return { organizationId, role };
  };

  router.get("/organizations/me/volunteers", ...self, asyncRoute(async (req, res) => {
    const { organizationId, role } = requireOrganization(req, res);
    if (!getOrganizationMemberships) throw new Error("Clerk organization membership lookup is unavailable.");
    const memberships = await getOrganizationMemberships(organizationId);
    res.status(200).json({ data: await listOrganizationVolunteers(getSupabase(), memberships, role) });
  }));
  router.get("/organizations/me/volunteers/:id", ...self, validate(associationIdSchema, "params"), asyncRoute(async (req, res) => {
    const { organizationId, role } = requireOrganization(req, res);
    if (!getOrganizationMemberships) throw new Error("Clerk organization membership lookup is unavailable.");
    const memberships = await getOrganizationMemberships(organizationId);
    const id = (res.locals.validated as { id: string }).id;
    res.status(200).json({ data: await readOrganizationVolunteer(getSupabase(), memberships, id, role) });
  }));

  return router;
}
