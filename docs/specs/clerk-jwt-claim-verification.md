# Clerk JWT claim verification for Supabase

**Status:** Awaiting a real signed-in app session  
**Scope:** Claim verification prerequisite for RLS policies  
**Related:** [RLS permission matrix](./database-rls-permission-matrix.md)

## Current code path

The mobile Supabase client receives the token returned by Clerk Expo `getToken()` through `accessToken`. The app does not request a named JWT template. Current Clerk documentation recommends its native Supabase third-party-auth integration; it says authenticated Clerk session tokens must carry `role: "authenticated"`. Clerk's legacy Supabase JWT template has been deprecated.

## Expected claims to verify at runtime

The following are expectations from current official documentation, not confirmation of this project's live token:

- `sub`: Clerk user subject; expected to identify the signed-in Clerk user.
- `role`: must be `authenticated` for Supabase Data API requests.
- `sid`: session identifier for a session-bound token.
- `o`: optional active-organization object. When present, Clerk documents `o.id`, `o.rol`, and `o.per` for organization ID, role, and permissions. It is absent when no organization is active.

Do not write policy predicates from these expectations until a real token from this Clerk instance is inspected and the values/shape are confirmed. Do not use user-editable metadata claims for authorization.

## Development diagnostic

In development builds, `ClerkTokenBridge` requests the current session token and logs a redacted claim summary: claim names, whether `sub` looks like a Clerk user ID, whether `role` equals `authenticated`, and whether session/organization claims exist. It reruns the summary when the active organization changes. It never logs the JWT or claim values. The helper only decodes the payload; Clerk/Supabase signature verification is not performed by that helper.

To complete verification:

1. Start the app and sign in with an independent account. Capture the `[VC:SUPABASE] Clerk JWT claim summary` line.
2. Switch to a Clerk Organization and capture the summary again. Organization claims are conditional on active organization context; the bridge logs only whether an organization is active, not its ID.
3. Confirm the Supabase third-party-auth integration accepts the Clerk token with a read-only request. Do not include or paste the token itself in logs or chat.
4. Record the sanitized summaries and then design policies using verified values and the approved schema.

## Current verification result

An independent signed-in session produced this sanitized payload summary:

- `sub` is present and has the Clerk user ID shape.
- `role` is `authenticated`.
- `sid` is present.
- No active-organization claim (`o`) or top-level organization ID/role claim was present in this session.

This verifies the observed claim shape for an independent session only. A session with an active Clerk Organization and an authenticated Supabase read-only request have not yet been observed. The repository's Phase 02 schema migration remains an unapplied draft and the connected database currently has legacy table names. No RLS policies have been created or applied.

## References

- [Clerk: Integrate Supabase](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Clerk: Session tokens and claims](https://clerk.com/docs/guides/sessions/session-tokens)
- [Supabase: Clerk third-party auth](https://supabase.com/docs/guides/auth/third-party/clerk)
