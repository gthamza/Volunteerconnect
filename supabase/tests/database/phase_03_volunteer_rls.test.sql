-- Run only against a local/test database with Phase 02 and Phase 03 applied.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.volunteer_profiles'::regclass),
  'volunteer profiles retain RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.volunteer_skills'::regclass),
  'volunteer skills retain RLS'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.volunteer_disaster_types'::regclass),
  'volunteer disaster preferences retain RLS'
);
select ok(
  exists (select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'volunteer_profiles'
      and column_name = 'local_area_knowledge' and data_type = 'boolean'),
  'local area knowledge is stored as a boolean'
);

insert into public.app_users (id, clerk_user_id)
values ('00000000-0000-0000-0000-000000000031', 'user_phase03_a'),
       ('00000000-0000-0000-0000-000000000032', 'user_phase03_b');
insert into public.volunteer_profiles (id, app_user_id, local_area_knowledge)
values ('00000000-0000-0000-0000-000000000041', '00000000-0000-0000-0000-000000000031', true),
       ('00000000-0000-0000-0000-000000000042', '00000000-0000-0000-0000-000000000032', false);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"user_phase03_a","role":"authenticated"}', true);

select is(
  (select count(*)::integer from public.volunteer_profiles),
  1,
  'a volunteer can read only their own profile'
);
select is(
  (select count(*)::integer from public.app_users),
  1,
  'a volunteer can read only their own identity mapping'
);
select is(
  (with changed as (
    update public.volunteer_profiles set local_area_knowledge = false
    where id = '00000000-0000-0000-0000-000000000042'
    returning id
  ) select count(*)::integer from changed),
  0,
  'a volunteer cannot update another volunteer profile'
);
select is(
  (select count(*)::integer from public.organizations),
  0,
  'organization data has no client access without an approved organization claim policy'
);

select set_config('request.jwt.claims', '{"sub":"user_phase03_a","role":"authenticated","o":{"id":"org_someone_else","rol":"org:member"}}', true);
select is(
  (select count(*)::integer from public.volunteer_profiles where id = '00000000-0000-0000-0000-000000000042'),
  0,
  'an active Clerk organization claim does not grant cross-organization direct profile access'
);

reset role;
select * from finish();
rollback;
