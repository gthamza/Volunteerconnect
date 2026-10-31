/**
 * Reads only the claim shape needed for local Supabase integration diagnostics.
 * This decodes the Clerk SDK token payload; it does not verify its signature.
 */
export function summarizeClerkJwtClaims(token: string) {
  try {
    const payload = token.split(".")[1];
    if (!payload || typeof globalThis.atob !== "function") {
      return { decoded: false as const };
    }

    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const claims: unknown = JSON.parse(globalThis.atob(padded));
    if (!isRecord(claims)) return { decoded: false as const };

    const organizationClaim = isRecord(claims.o) ? claims.o : undefined;
    return {
      decoded: true as const,
      claimNames: Object.keys(claims).sort(),
      hasClerkSubject: typeof claims.sub === "string" && claims.sub.startsWith("user_"),
      roleClaimStatus:
        claims.role === "authenticated"
          ? "authenticated"
          : claims.role === undefined
            ? "missing"
            : "present-with-other-value",
      hasSessionId: typeof claims.sid === "string",
      hasTopLevelOrganizationId: typeof claims.org_id === "string",
      hasTopLevelOrganizationRole: typeof claims.org_role === "string",
      organizationClaimNames: organizationClaim ? Object.keys(organizationClaim).sort() : [],
      hasOrganizationId: typeof organizationClaim?.id === "string",
      hasOrganizationRole: typeof organizationClaim?.rol === "string",
      hasOrganizationPermissions: Array.isArray(organizationClaim?.per),
    };
  } catch {
    return { decoded: false as const };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
