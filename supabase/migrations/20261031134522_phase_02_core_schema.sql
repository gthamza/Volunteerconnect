-- DRAFT ONLY — this migration has not been applied to Supabase.
-- Preserve the pre-Phase-02 public schema, then establish the proposed
-- VolunteerConnect tables as the canonical public tables. Existing table
-- contents are retained under legacy_* names; no legacy rows are dropped.

ALTER TABLE public.users RENAME TO legacy_users;
ALTER TABLE public.organizations RENAME TO legacy_organizations;
ALTER TABLE public.volunteers RENAME TO legacy_volunteers;
ALTER TABLE public.disaster_types RENAME TO legacy_disaster_types;
ALTER TABLE public.volunteer_disaster_types RENAME TO legacy_volunteer_disaster_types;
ALTER TABLE public.skills RENAME TO legacy_skills;
ALTER TABLE public.volunteer_skills RENAME TO legacy_volunteer_skills;
ALTER TABLE public.tasks RENAME TO legacy_tasks;
ALTER TABLE public.task_skills RENAME TO legacy_task_skills;
ALTER TABLE public.task_volunteers RENAME TO legacy_task_volunteers;
ALTER TABLE public.volunteer_requests RENAME TO legacy_volunteer_requests;
ALTER TABLE public.ai_match_results RENAME TO legacy_ai_match_results;
ALTER TABLE public.notifications RENAME TO legacy_notifications;

CREATE TABLE public.app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_organization_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.volunteer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id uuid NOT NULL UNIQUE
    REFERENCES public.app_users(id) ON DELETE RESTRICT,
  location geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_profiles_location_bounds CHECK (
    location IS NULL OR (
      ST_Y(location::geometry) BETWEEN -90 AND 90 AND
      ST_X(location::geometry) BETWEEN -180 AND 180
    )
  )
);

CREATE TABLE public.disaster_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  CONSTRAINT disaster_types_name_allowed CHECK (name IN ('Flood', 'Earthquake'))
);

INSERT INTO public.disaster_types (id, name)
SELECT id, name
FROM public.legacy_disaster_types
WHERE name IN ('Flood', 'Earthquake');

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.volunteer_disaster_types (
  volunteer_profile_id uuid NOT NULL
    REFERENCES public.volunteer_profiles(id) ON DELETE RESTRICT,
  disaster_type_id uuid NOT NULL
    REFERENCES public.disaster_types(id) ON DELETE RESTRICT,
  PRIMARY KEY (volunteer_profile_id, disaster_type_id)
);

CREATE TABLE public.volunteer_skills (
  volunteer_profile_id uuid NOT NULL
    REFERENCES public.volunteer_profiles(id) ON DELETE RESTRICT,
  skill_id uuid NOT NULL
    REFERENCES public.skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (volunteer_profile_id, skill_id)
);

CREATE TABLE public.disaster_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  disaster_type_id uuid NOT NULL
    REFERENCES public.disaster_types(id) ON DELETE RESTRICT,
  location geography(Point, 4326) NOT NULL,
  status text NOT NULL DEFAULT 'Open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT disaster_tasks_status_allowed CHECK (
    status IN ('Open', 'Assigned', 'Ongoing', 'Completed')
  ),
  CONSTRAINT disaster_tasks_location_bounds CHECK (
    ST_Y(location::geometry) BETWEEN -90 AND 90 AND
    ST_X(location::geometry) BETWEEN -180 AND 180
  )
);

CREATE TABLE public.task_required_skills (
  task_id uuid NOT NULL
    REFERENCES public.disaster_tasks(id) ON DELETE RESTRICT,
  skill_id uuid NOT NULL
    REFERENCES public.skills(id) ON DELETE RESTRICT,
  PRIMARY KEY (task_id, skill_id)
);

CREATE TABLE public.matching_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE
    REFERENCES public.disaster_tasks(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.matching_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_report_id uuid NOT NULL
    REFERENCES public.matching_reports(id) ON DELETE RESTRICT,
  volunteer_profile_id uuid NOT NULL
    REFERENCES public.volunteer_profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT matching_recommendations_report_volunteer_unique
    UNIQUE (matching_report_id, volunteer_profile_id),
  CONSTRAINT matching_recommendations_id_volunteer_unique
    UNIQUE (id, volunteer_profile_id)
);

CREATE TABLE public.volunteer_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matching_recommendation_id uuid NOT NULL,
  volunteer_profile_id uuid NOT NULL,
  response_status text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT volunteer_invitations_recommendation_volunteer_fkey
    FOREIGN KEY (matching_recommendation_id, volunteer_profile_id)
    REFERENCES public.matching_recommendations(id, volunteer_profile_id)
    ON DELETE RESTRICT
);

CREATE TABLE public.organization_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL
    REFERENCES public.disaster_tasks(id) ON DELETE RESTRICT,
  receiving_organization_id uuid NOT NULL
    REFERENCES public.organizations(id) ON DELETE RESTRICT,
  response_status text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_request_members (
  organization_request_id uuid NOT NULL
    REFERENCES public.organization_requests(id) ON DELETE RESTRICT,
  volunteer_profile_id uuid NOT NULL
    REFERENCES public.volunteer_profiles(id) ON DELETE RESTRICT,
  PRIMARY KEY (organization_request_id, volunteer_profile_id)
);

CREATE TABLE public.notification_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_invitation_id uuid
    REFERENCES public.volunteer_invitations(id) ON DELETE RESTRICT,
  organization_request_id uuid
    REFERENCES public.organization_requests(id) ON DELETE RESTRICT,
  channel text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_records_one_parent CHECK (
    (volunteer_invitation_id IS NOT NULL AND organization_request_id IS NULL) OR
    (volunteer_invitation_id IS NULL AND organization_request_id IS NOT NULL)
  ),
  CONSTRAINT notification_records_channel_allowed CHECK (channel IN ('SMS', 'email'))
);

CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_app_user_id uuid REFERENCES public.app_users(id) ON DELETE RESTRICT,
  organization_id uuid REFERENCES public.organizations(id) ON DELETE RESTRICT,
  disaster_task_id uuid REFERENCES public.disaster_tasks(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index referencing columns for joins, authorization, and parent lookups.
CREATE INDEX volunteer_disaster_types_disaster_type_id_idx
  ON public.volunteer_disaster_types(disaster_type_id);
CREATE INDEX volunteer_skills_skill_id_idx
  ON public.volunteer_skills(skill_id);
CREATE INDEX volunteer_profiles_location_gix
  ON public.volunteer_profiles USING gist(location);
CREATE INDEX disaster_tasks_organization_id_idx
  ON public.disaster_tasks(organization_id);
CREATE INDEX disaster_tasks_disaster_type_id_idx
  ON public.disaster_tasks(disaster_type_id);
CREATE INDEX disaster_tasks_status_idx
  ON public.disaster_tasks(status);
CREATE INDEX disaster_tasks_location_gix
  ON public.disaster_tasks USING gist(location);
CREATE INDEX task_required_skills_skill_id_idx
  ON public.task_required_skills(skill_id);
CREATE INDEX matching_recommendations_volunteer_profile_id_idx
  ON public.matching_recommendations(volunteer_profile_id);
CREATE INDEX volunteer_invitations_volunteer_profile_id_idx
  ON public.volunteer_invitations(volunteer_profile_id);
CREATE INDEX organization_requests_receiving_organization_id_idx
  ON public.organization_requests(receiving_organization_id);
CREATE INDEX organization_request_members_volunteer_profile_id_idx
  ON public.organization_request_members(volunteer_profile_id);
CREATE INDEX notification_records_volunteer_invitation_id_idx
  ON public.notification_records(volunteer_invitation_id)
  WHERE volunteer_invitation_id IS NOT NULL;
CREATE INDEX notification_records_organization_request_id_idx
  ON public.notification_records(organization_request_id)
  WHERE organization_request_id IS NOT NULL;
CREATE INDEX audit_events_actor_app_user_id_idx
  ON public.audit_events(actor_app_user_id)
  WHERE actor_app_user_id IS NOT NULL;
CREATE INDEX audit_events_organization_id_idx
  ON public.audit_events(organization_id)
  WHERE organization_id IS NOT NULL;
CREATE INDEX audit_events_disaster_task_id_idx
  ON public.audit_events(disaster_task_id)
  WHERE disaster_task_id IS NOT NULL;

-- RLS is enabled now. Policies remain deferred until Clerk claims and the
-- authorization path are verified; with no policies, client roles are denied.
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_disaster_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disaster_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_required_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matching_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.volunteer_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_request_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
