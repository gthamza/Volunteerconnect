-- Run only in a local/test database after the Phase 02 migration has been
-- reviewed and applied. This suite is transactional and rolls back its fixtures.
begin;

create extension if not exists pgtap with schema extensions;
select plan(13);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any(array[
        'app_users', 'organizations', 'volunteer_profiles', 'disaster_types',
        'skills', 'volunteer_disaster_types', 'volunteer_skills', 'disaster_tasks',
        'task_required_skills', 'matching_reports', 'matching_recommendations',
        'volunteer_invitations', 'organization_requests', 'organization_request_members',
        'notification_records', 'audit_events'
      ])
  ),
  16,
  'all 16 Phase 02 application tables exist'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any(array[
        'app_users', 'organizations', 'volunteer_profiles', 'disaster_types',
        'skills', 'volunteer_disaster_types', 'volunteer_skills', 'disaster_tasks',
        'task_required_skills', 'matching_reports', 'matching_recommendations',
        'volunteer_invitations', 'organization_requests', 'organization_request_members',
        'notification_records', 'audit_events'
      ])
      and exists (
        select 1 from pg_constraint con
        where con.conrelid = c.oid and con.contype = 'p'
      )
  ),
  16,
  'every application table has a primary key'
);

select is(
  (
    select count(*)::integer
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relname = any(array[
        'app_users', 'organizations', 'volunteer_profiles', 'disaster_types',
        'skills', 'volunteer_disaster_types', 'volunteer_skills', 'disaster_tasks',
        'task_required_skills', 'matching_reports', 'matching_recommendations',
        'volunteer_invitations', 'organization_requests', 'organization_request_members',
        'notification_records', 'audit_events'
      ])
      and c.relrowsecurity
  ),
  16,
  'row level security is enabled on every application table'
);

select ok(
  exists (select 1 from pg_extension where extname = 'postgis'),
  'PostGIS is installed'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where relkind = 'i'
      and relname in ('volunteer_profiles_location_gix', 'disaster_tasks_location_gix')
  ),
  2,
  'volunteer and task locations have spatial indexes'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.disaster_types'::regclass
      and conname = 'disaster_types_name_allowed'
      and contype = 'c'
  ),
  'disaster type check constraint is present'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.disaster_tasks'::regclass
      and conname = 'disaster_tasks_status_allowed'
      and contype = 'c'
  ),
  'task lifecycle check constraint is present'
);

select ok(
  (
    select count(*) >= 20
    from pg_constraint con
    join pg_namespace n on n.oid = con.connamespace
    where n.nspname = 'public' and con.contype = 'f'
  ),
  'foreign keys protect application relationships'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.matching_reports'::regclass
      and contype = 'u'
      and conkey = array[(
        select attnum from pg_attribute
        where attrelid = 'public.matching_reports'::regclass and attname = 'task_id'
      )]::smallint[]
  ),
  'a task can have at most one matching report'
);

select is(
  (select count(*)::integer from public.disaster_types where name in ('Flood', 'Earthquake')),
  2,
  'the supported disaster types are Flood and Earthquake'
);

select throws_ok(
  $$insert into public.disaster_types (name) values ('Tornado')$$,
  '23514',
  null,
  'unsupported disaster types are rejected'
);

select throws_ok(
  $$
    with new_org as (
      insert into public.organizations (clerk_organization_id)
      values ('pgtap-' || gen_random_uuid()::text)
      returning id
    ),
    flood as (
      select id from public.disaster_types where name = 'Flood' limit 1
    )
    insert into public.disaster_tasks (organization_id, disaster_type_id, location, status)
    select new_org.id, flood.id, 'SRID=4326;POINT(67 24)'::geography, 'Invalid'
    from new_org cross join flood
  $$,
  '23514',
  null,
  'unsupported task statuses are rejected'
);

select throws_ok(
  $$
    with new_org as (
      insert into public.organizations (clerk_organization_id)
      values ('pgtap-' || gen_random_uuid()::text)
      returning id
    ),
    flood as (
      select id from public.disaster_types where name = 'Flood' limit 1
    ),
    new_task as (
      insert into public.disaster_tasks (organization_id, disaster_type_id, location)
      select new_org.id, flood.id, 'SRID=4326;POINT(67 24)'::geography
      from new_org cross join flood
      returning id
    )
    insert into public.matching_reports (task_id)
    select id from new_task
    union all
    select id from new_task
  $$,
  '23505',
  null,
  'a task cannot receive duplicate matching reports'
);

select * from finish();
rollback;
