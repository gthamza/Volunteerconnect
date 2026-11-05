-- Phase 03 database foundation. Existing Phase 02 tables are reused.
-- Clerk remains the identity provider; no Supabase Auth users or passwords
-- are introduced. Organization profile reads are served only by Express after
-- checking Clerk's active organization and live membership roster. Direct
-- client access to other volunteers remains denied because the database has
-- no Clerk-backed affiliation relation or verified organization claim policy.

ALTER TABLE public.volunteer_profiles
  ADD COLUMN local_area_knowledge boolean;

-- The only verified claim contract currently recorded for this Clerk instance
-- is sub=<Clerk user ID>, role=authenticated for independent-user sessions.
-- Keep app_users identity mapping readable only by its matching Clerk user.
CREATE POLICY app_users_select_self
  ON public.app_users FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt() ->> 'role') = 'authenticated'
    AND clerk_user_id = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY volunteer_profiles_select_self
  ON public.volunteer_profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.app_users u
      WHERE u.id = volunteer_profiles.app_user_id
        AND u.clerk_user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY volunteer_profiles_insert_self
  ON public.volunteer_profiles FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.app_users u
      WHERE u.id = volunteer_profiles.app_user_id
        AND u.clerk_user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY volunteer_profiles_update_self
  ON public.volunteer_profiles FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.app_users u
      WHERE u.id = volunteer_profiles.app_user_id
        AND u.clerk_user_id = (SELECT auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.app_users u
      WHERE u.id = volunteer_profiles.app_user_id
        AND u.clerk_user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

-- Keep identity ownership and timestamps immutable to direct client updates.
REVOKE UPDATE ON public.volunteer_profiles FROM authenticated;
GRANT UPDATE (location, local_area_knowledge)
  ON public.volunteer_profiles TO authenticated;

CREATE POLICY skills_select_catalogue
  ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY disaster_types_select_catalogue
  ON public.disaster_types FOR SELECT TO authenticated USING (true);

CREATE POLICY volunteer_skills_select_self
  ON public.volunteer_skills FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.volunteer_profiles vp
      WHERE vp.id = volunteer_skills.volunteer_profile_id
    )
  );
CREATE POLICY volunteer_skills_insert_self
  ON public.volunteer_skills FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.volunteer_profiles vp
      WHERE vp.id = volunteer_skills.volunteer_profile_id
    )
  );
CREATE POLICY volunteer_skills_delete_self
  ON public.volunteer_skills FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.volunteer_profiles vp
      WHERE vp.id = volunteer_skills.volunteer_profile_id
    )
  );

CREATE POLICY volunteer_disaster_types_select_self
  ON public.volunteer_disaster_types FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.volunteer_profiles vp
      WHERE vp.id = volunteer_disaster_types.volunteer_profile_id
    )
  );
CREATE POLICY volunteer_disaster_types_insert_self
  ON public.volunteer_disaster_types FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.volunteer_profiles vp
      WHERE vp.id = volunteer_disaster_types.volunteer_profile_id
    )
  );
CREATE POLICY volunteer_disaster_types_delete_self
  ON public.volunteer_disaster_types FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.volunteer_profiles vp
      WHERE vp.id = volunteer_disaster_types.volunteer_profile_id
    )
  );

-- No policy is added for direct organization access to volunteer data.
-- PostgreSQL denies cross-user access under RLS; organization reads must go
-- through the Express API's Clerk membership authorization.
