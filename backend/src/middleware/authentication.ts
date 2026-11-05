import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";

/** Requires a verified Clerk session. Authorization is added by feature routes. */
export function createRequireAuthenticatedUser(
  resolveAuth: typeof getAuth = getAuth,
): RequestHandler {
  return (req, res, next) => {
    const auth = resolveAuth(req);
    if (!auth.isAuthenticated || !auth.userId) {
      res.status(401).json({
        error: { code: "UNAUTHORIZED", message: "Authentication is required." },
        ...(typeof res.locals.requestId === "string" ? { requestId: res.locals.requestId } : {}),
      });
      return;
    }

    res.locals.userId = auth.userId;
    // These values come from Clerk's verified session, never from the request body.
    res.locals.organizationId = auth.orgId ?? null;
    res.locals.organizationRole = auth.orgRole ?? null;
    next();
  };
}

export const requireAuthenticatedUser = createRequireAuthenticatedUser();
