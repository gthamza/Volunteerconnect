-- Run only against a local/test database with the reviewed Phase 02 baseline
-- and Phase 04 task RLS migration installed.
-- Until organization claim and registration authorization are approved,
-- direct client access is intentionally denied for every task row.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SELECT plan(8);

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.disaster_tasks'::regclass),
  'disaster_tasks has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.task_required_skills'::regclass),
  'task_required_skills has RLS enabled'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.disaster_tasks', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.disaster_tasks', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.disaster_tasks', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.disaster_tasks', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.disaster_tasks', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.disaster_tasks', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.disaster_tasks', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.disaster_tasks', 'DELETE'),
  'direct client roles cannot access task rows or mutate task ownership/status'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.task_required_skills', 'SELECT')
  AND NOT has_table_privilege('authenticated', 'public.task_required_skills', 'SELECT')
  AND NOT has_table_privilege('anon', 'public.task_required_skills', 'INSERT')
  AND NOT has_table_privilege('authenticated', 'public.task_required_skills', 'INSERT')
  AND NOT has_table_privilege('anon', 'public.task_required_skills', 'UPDATE')
  AND NOT has_table_privilege('authenticated', 'public.task_required_skills', 'UPDATE')
  AND NOT has_table_privilege('anon', 'public.task_required_skills', 'DELETE')
  AND NOT has_table_privilege('authenticated', 'public.task_required_skills', 'DELETE'),
  'direct client roles cannot access or mutate task skill relationships'
);

SELECT ok(
  has_table_privilege('service_role', 'public.disaster_tasks', 'SELECT')
  AND has_table_privilege('service_role', 'public.disaster_tasks', 'INSERT')
  AND has_table_privilege('service_role', 'public.disaster_tasks', 'UPDATE')
  AND has_table_privilege('service_role', 'public.disaster_tasks', 'DELETE'),
  'the backend service role has task table privileges'
);

SELECT ok(
  has_table_privilege('service_role', 'public.task_required_skills', 'SELECT')
  AND has_table_privilege('service_role', 'public.task_required_skills', 'INSERT')
  AND has_table_privilege('service_role', 'public.task_required_skills', 'UPDATE')
  AND has_table_privilege('service_role', 'public.task_required_skills', 'DELETE'),
  'the backend service role has task skill table privileges'
);

SELECT is(
  (
    SELECT count(*)::integer
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('disaster_tasks', 'task_required_skills')
  ),
  0,
  'no unverified organization claim policy grants direct task access'
);

SELECT ok(
  (SELECT rolbypassrls FROM pg_roles WHERE rolname = 'service_role'),
  'service role bypasses RLS and must remain server-only behind Express authorization'
);

SELECT * FROM finish();
ROLLBACK;
