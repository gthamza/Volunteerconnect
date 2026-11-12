-- Phase 04: add required task information to the canonical Phase 02 schema.
-- Prerequisite: the approved Phase 02 baseline has created disaster_tasks.
-- This migration deliberately does not create a second task or skill table.

ALTER TABLE public.disaster_tasks
  ADD COLUMN description text,
  ADD COLUMN required_volunteer_count integer;

-- Never invent values for existing tasks. Stop and request an approved
-- backfill if the canonical table already contains incomplete task records.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.disaster_tasks
    WHERE description IS NULL
       OR required_volunteer_count IS NULL
  ) THEN
    RAISE EXCEPTION
      'Phase 04 requires a reviewed backfill for existing task descriptions and volunteer counts.';
  END IF;
END
$$;

ALTER TABLE public.disaster_tasks
  ALTER COLUMN description SET NOT NULL,
  ALTER COLUMN required_volunteer_count SET NOT NULL;

ALTER TABLE public.disaster_tasks
  ADD CONSTRAINT disaster_tasks_required_volunteer_count_positive
  CHECK (required_volunteer_count > 0);
