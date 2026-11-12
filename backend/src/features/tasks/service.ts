import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../../lib/api-error.js";
import { readPostgisPoint, toPostgisPointWkt } from "../../lib/geography.js";
import type { CreateTaskInput, TaskStatusInput, UpdateTaskInput } from "./schemas.js";

const SUPPORTED_DISASTER_TYPES = ["Flood", "Earthquake"] as const;
const TASK_FIELDS = "id, organization_id, disaster_type_id, description, location, required_volunteer_count, status, created_at, updated_at";
const STATUS_PREDECESSOR: Record<TaskStatusInput["status"], string> = {
  Assigned: "Open",
  Ongoing: "Assigned",
  Completed: "Ongoing",
};

type TaskRow = {
  id: string;
  organization_id: string;
  disaster_type_id: string;
  description: string;
  location: unknown;
  required_volunteer_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

type DatabaseResult<T> = { data: T | null; error: unknown };

function databaseFailure(error: unknown): never {
  const code = error && typeof error === "object" && "code" in error ? error.code : undefined;
  const failure = new Error("Task data operation failed.") as Error & { providerCode?: string };
  if (typeof code === "string") failure.providerCode = code;
  throw failure;
}

async function result<T>(operation: PromiseLike<DatabaseResult<T>>, allowNull = false): Promise<T | null> {
  const response = await operation;
  if (response.error) databaseFailure(response.error);
  if (response.data === null && !allowNull) throw new Error("Expected task data was not returned.");
  return response.data;
}

async function validateReferences(supabase: SupabaseClient, disasterTypeId: string, skillIds: string[]) {
  const disasterType = await result<{ id: string; name: string }>(
    supabase.from("disaster_types").select("id, name").eq("id", disasterTypeId).maybeSingle(),
    true,
  );
  if (!disasterType || !SUPPORTED_DISASTER_TYPES.includes(disasterType.name as typeof SUPPORTED_DISASTER_TYPES[number])) {
    throw new ApiError(400, "INVALID_DISASTER_TYPE", "Select Flood or Earthquake as the disaster type.");
  }

  if (skillIds.length === 0) return;
  const skills = await result<Array<{ id: string }>>(
    supabase.from("skills").select("id").in("id", skillIds),
  );
  if ((skills ?? []).length !== skillIds.length) {
    throw new ApiError(400, "INVALID_SKILL", "One or more required skills are not in the catalogue.");
  }
}

async function readTaskRow(supabase: SupabaseClient, organizationId: string, taskId: string): Promise<TaskRow> {
  const task = await result<TaskRow>(
    supabase.from("disaster_tasks").select(TASK_FIELDS)
      .eq("id", taskId).eq("organization_id", organizationId).maybeSingle(),
    true,
  );
  if (!task) throw new ApiError(404, "TASK_NOT_FOUND", "The task was not found.");
  return task;
}

async function taskResponse(supabase: SupabaseClient, task: TaskRow) {
  const [disasterType, associations] = await Promise.all([
    result<{ id: string; name: string }>(
      supabase.from("disaster_types").select("id, name").eq("id", task.disaster_type_id).maybeSingle(),
      true,
    ),
    result<Array<{ skill_id: string }>>(
      supabase.from("task_required_skills").select("skill_id").eq("task_id", task.id),
    ),
  ]);
  if (!disasterType) throw new Error("Task disaster type was not found.");

  const skillIds = (associations ?? []).map(({ skill_id }) => skill_id);
  const skills = skillIds.length === 0
    ? []
    : (await result<Array<{ id: string; name: string }>>(
        supabase.from("skills").select("id, name").in("id", skillIds),
      ) ?? []);

  return {
    id: task.id,
    organizationId: task.organization_id,
    disasterType: { id: disasterType.id, name: disasterType.name },
    description: task.description,
    affectedLocation: readPostgisPoint(task.location),
    requiredSkills: skills,
    requiredVolunteerCount: task.required_volunteer_count,
    status: task.status,
    createdAt: task.created_at,
    updatedAt: task.updated_at,
  };
}

export async function createTask(
  supabase: SupabaseClient,
  organizationId: string,
  input: CreateTaskInput,
) {
  await validateReferences(supabase, input.disasterTypeId, input.requiredSkillIds);
  const task = await result<TaskRow>(
    supabase.from("disaster_tasks").insert({
      organization_id: organizationId,
      disaster_type_id: input.disasterTypeId,
      description: input.description,
      location: toPostgisPointWkt(input.affectedLocation),
      required_volunteer_count: input.requiredVolunteerCount,
      status: "Open",
    }).select(TASK_FIELDS).single(),
  );
  if (!task) throw new Error("Created task was not returned.");

  if (input.requiredSkillIds.length > 0) {
    try {
      await result<unknown>(supabase.from("task_required_skills").insert(
        input.requiredSkillIds.map((skillId) => ({ task_id: task.id, skill_id: skillId })),
      ), true);
    } catch (error) {
      // Best-effort compensation keeps failed skill writes from leaving a task
      // that appears fully created. Database constraints remain authoritative.
      const cleanup = await supabase.from("disaster_tasks").delete()
        .eq("id", task.id).eq("organization_id", organizationId);
      if (cleanup.error) databaseFailure(cleanup.error);
      throw error;
    }
  }

  return taskResponse(supabase, task);
}

export async function listOrganizationTasks(supabase: SupabaseClient, organizationId: string) {
  const tasks = await result<TaskRow[]>(
    supabase.from("disaster_tasks").select(TASK_FIELDS)
      .eq("organization_id", organizationId).order("created_at", { ascending: false }),
  );
  return Promise.all((tasks ?? []).map((task) => taskResponse(supabase, task)));
}

export async function getOrganizationTask(supabase: SupabaseClient, organizationId: string, taskId: string) {
  return taskResponse(supabase, await readTaskRow(supabase, organizationId, taskId));
}

export async function updateOrganizationTask(
  supabase: SupabaseClient,
  organizationId: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  const current = await readTaskRow(supabase, organizationId, taskId);
  if (input.disasterTypeId || input.requiredSkillIds) {
    await validateReferences(
      supabase,
      input.disasterTypeId ?? current.disaster_type_id,
      input.requiredSkillIds ?? [],
    );
  }

  const update: Record<string, unknown> = {};
  if (input.disasterTypeId !== undefined) update.disaster_type_id = input.disasterTypeId;
  if (input.description !== undefined) update.description = input.description;
  if (input.affectedLocation !== undefined) update.location = toPostgisPointWkt(input.affectedLocation);
  if (input.requiredVolunteerCount !== undefined) update.required_volunteer_count = input.requiredVolunteerCount;
  let task = current;
  if (Object.keys(update).length > 0) {
    update.updated_at = new Date().toISOString();
    const updated = await result<TaskRow>(
      supabase.from("disaster_tasks").update(update)
        .eq("id", taskId).eq("organization_id", organizationId).select(TASK_FIELDS).single(),
    );
    if (!updated) throw new ApiError(404, "TASK_NOT_FOUND", "The task was not found.");
    task = updated;
  }

  if (input.requiredSkillIds !== undefined) {
    await result<unknown>(supabase.from("task_required_skills").delete().eq("task_id", taskId), true);
    if (input.requiredSkillIds.length > 0) {
      await result<unknown>(supabase.from("task_required_skills").insert(
        input.requiredSkillIds.map((skillId) => ({ task_id: taskId, skill_id: skillId })),
      ), true);
    }
  }

  return taskResponse(supabase, task);
}

export async function updateOrganizationTaskStatus(
  supabase: SupabaseClient,
  organizationId: string,
  taskId: string,
  input: TaskStatusInput,
) {
  const expectedStatus = STATUS_PREDECESSOR[input.status];
  const updated = await result<TaskRow>(
    supabase.from("disaster_tasks").update({ status: input.status, updated_at: new Date().toISOString() })
      .eq("id", taskId).eq("organization_id", organizationId).eq("status", expectedStatus)
      .select(TASK_FIELDS).maybeSingle(),
    true,
  );
  if (!updated) {
    const task = await readTaskRow(supabase, organizationId, taskId);
    throw new ApiError(409, "INVALID_STATUS_TRANSITION", `A task in ${task.status} status cannot move to ${input.status}.`);
  }
  return taskResponse(supabase, updated);
}
