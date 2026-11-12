-- Phase 04: keep task tables inaccessible to direct client roles.
-- Task operations are performed only through authenticated Express APIs.
-- Express must verify the Clerk session, registered-organization authority,
-- active membership, and task ownership before using its server-only key.
-- No organization JWT policy is added until the active-organization claim and
-- organization registration authorization contract are verified.

ALTER TABLE public.disaster_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_required_skills ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.disaster_tasks, public.task_required_skills
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.disaster_tasks, public.task_required_skills
  TO service_role;
