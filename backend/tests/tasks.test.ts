import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import express, { type RequestHandler } from "express";
import type { OrganizationMembership } from "@clerk/express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ApiError } from "../src/lib/api-error.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { createTaskRouter } from "../src/routes/tasks.js";

const TASK_ID = "a1000000-0000-4000-8000-000000000001";
const DISASTER_ID = "a2000000-0000-4000-8000-000000000001";
const SKILL_ID = "a3000000-0000-4000-8000-000000000001";
const OTHER_SKILL_ID = "a3000000-0000-4000-8000-000000000002";
const ORG_A = "a4000000-0000-4000-8000-000000000001";
const ORG_B = "a4000000-0000-4000-8000-000000000002";
const USER_ID = "user_test_a";

type Task = {
  id: string;
  organization_id: string;
  disaster_type_id: string;
  description: string;
  location: string;
  required_volunteer_count: number;
  status: string;
  created_at: string;
  updated_at: string;
};

test("task creation validates references, derives owner, stores skills and starts Open", async () => {
  const database = new TaskDatabase();
  const api = await startApi(database);
  try {
    const response = await fetch(`${api.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        disasterTypeId: DISASTER_ID,
        description: "Deliver emergency water supplies",
        affectedLocation: { latitude: 33.6844, longitude: 73.0479 },
        requiredSkillIds: [SKILL_ID, OTHER_SKILL_ID],
        requiredVolunteerCount: 6,
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json() as { data: Record<string, unknown> };
    assert.equal(body.data.organizationId, ORG_A);
    assert.equal(body.data.status, "Open");
    assert.deepEqual(body.data.affectedLocation, { latitude: 33.6844, longitude: 73.0479 });
    assert.deepEqual(body.data.requiredSkills, [
      { id: SKILL_ID, name: "First Aid" },
      { id: OTHER_SKILL_ID, name: "Logistics" },
    ]);
    assert.equal(database.tasks[0]?.location, "SRID=4326;POINT(73.0479 33.6844)");
    assert.deepEqual(database.task_required_skills.map(({ skill_id }) => skill_id), [SKILL_ID, OTHER_SKILL_ID]);
  } finally {
    await api.close();
  }
});

test("task creation accepts Earthquake and persists multiple catalogue skill relationships", async () => {
  const database = new TaskDatabase();
  const api = await startApi(database);
  try {
    const response = await fetch(`${api.url}/tasks`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        disasterTypeId: "a2000000-0000-4000-8000-000000000002",
        description: "Assess earthquake damage and distribute supplies",
        affectedLocation: { latitude: 34.0151, longitude: 71.5249 },
        requiredSkillIds: [SKILL_ID, OTHER_SKILL_ID],
        requiredVolunteerCount: 8,
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json() as { data: { disasterType: { name: string }; status: string; requiredSkills: Array<{ id: string }> } };
    assert.equal(body.data.disasterType.name, "Earthquake");
    assert.equal(body.data.status, "Open");
    assert.deepEqual(body.data.requiredSkills.map(({ id }) => id), [SKILL_ID, OTHER_SKILL_ID]);
    assert.equal(database.task_required_skills.length, 2);
  } finally {
    await api.close();
  }
});

test("task creation rejects invalid references, count, location, duplicate skills, and client ownership", async () => {
  const api = await startApi(new TaskDatabase());
  try {
    const base = {
      disasterTypeId: DISASTER_ID,
      description: "Relief task",
      affectedLocation: { latitude: 33, longitude: 73 },
      requiredSkillIds: [SKILL_ID],
      requiredVolunteerCount: 1,
    };
    const cases = [
      { body: { ...base, disasterTypeId: "a2000000-0000-4000-8000-000000000099" }, code: "INVALID_DISASTER_TYPE" },
      { body: { ...base, requiredSkillIds: ["a3000000-0000-4000-8000-000000000099"] }, code: "INVALID_SKILL" },
      { body: { ...base, requiredVolunteerCount: 0 }, code: "VALIDATION_ERROR" },
      { body: { ...base, affectedLocation: { latitude: 91, longitude: 73 } }, code: "VALIDATION_ERROR" },
      { body: { ...base, requiredSkillIds: [SKILL_ID, SKILL_ID] }, code: "VALIDATION_ERROR" },
      { body: { ...base, organizationId: ORG_B }, code: "VALIDATION_ERROR" },
    ];
    for (const item of cases) {
      const response = await fetch(`${api.url}/tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(item.body),
      });
      assert.equal(response.status, 400);
      assert.equal((await response.json() as { error: { code: string } }).error.code, item.code);
    }
    assert.equal(api.database.tasks.length, 0);
  } finally {
    await api.close();
  }
});

test("task list and detail are scoped to the authorized organization", async () => {
  const database = new TaskDatabase();
  database.tasks.push(
    taskRow(TASK_ID, ORG_A, "A task"),
    taskRow("a1000000-0000-4000-8000-000000000002", ORG_B, "Another organization's task"),
  );
  database.task_required_skills.push({ task_id: TASK_ID, skill_id: SKILL_ID });
  const api = await startApi(database);
  try {
    const list = await fetch(`${api.url}/tasks`);
    assert.equal(list.status, 200);
    const listBody = await list.json() as { data: Array<{ id: string }> };
    assert.deepEqual(listBody.data.map(({ id }) => id), [TASK_ID]);

    const owned = await fetch(`${api.url}/tasks/${TASK_ID}`);
    assert.equal(owned.status, 200);
    const foreign = await fetch(`${api.url}/tasks/a1000000-0000-4000-8000-000000000002`);
    assert.equal(foreign.status, 404);
    assert.equal((await foreign.json() as { error: { code: string } }).error.code, "TASK_NOT_FOUND");
    const foreignEdit = await fetch(`${api.url}/tasks/a1000000-0000-4000-8000-000000000002`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Attempted cross-organization edit" }),
    });
    assert.equal(foreignEdit.status, 404);
    const foreignStatusChange = await fetch(`${api.url}/tasks/a1000000-0000-4000-8000-000000000002/status`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Assigned" }),
    });
    assert.equal(foreignStatusChange.status, 404);
    assert.equal(database.tasks[1]?.status, "Open");
  } finally {
    await api.close();
  }
});

test("task edits cannot change ownership or status and status transitions cannot skip steps", async () => {
  const database = new TaskDatabase();
  database.tasks.push(taskRow(TASK_ID, ORG_A, "Original"));
  const api = await startApi(database, { assignmentReady: true });
  try {
    const invalidEdit = await fetch(`${api.url}/tasks/${TASK_ID}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId: ORG_B, status: "Completed" }),
    });
    assert.equal(invalidEdit.status, 400);

    const edit = await fetch(`${api.url}/tasks/${TASK_ID}`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ description: "Updated relief task", requiredSkillIds: [OTHER_SKILL_ID] }),
    });
    assert.equal(edit.status, 200);
    const editBody = await edit.json() as { data: { description: string; requiredSkills: Array<{ id: string }> } };
    assert.equal(editBody.data.description, "Updated relief task");
    assert.deepEqual(editBody.data.requiredSkills, [{ id: OTHER_SKILL_ID, name: "Logistics" }]);

    const skipped = await fetch(`${api.url}/tasks/${TASK_ID}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Ongoing" }),
    });
    assert.equal(skipped.status, 409);
    assert.equal((await skipped.json() as { error: { code: string } }).error.code, "INVALID_STATUS_TRANSITION");

    for (const status of ["Completed", "Open", "Accepted"] as const) {
      const response = await fetch(`${api.url}/tasks/${TASK_ID}/status`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      assert.equal(response.status, status === "Completed" ? 409 : 400);
    }

    for (const status of ["Assigned", "Ongoing", "Completed"] as const) {
      const response = await fetch(`${api.url}/tasks/${TASK_ID}/status`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      assert.equal(response.status, 200);
      assert.equal((await response.json() as { data: { status: string } }).data.status, status);
    }
    const afterCompletion = await fetch(`${api.url}/tasks/${TASK_ID}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Completed" }),
    });
    assert.equal(afterCompletion.status, 409);
    assert.equal(database.tasks[0]?.organization_id, ORG_A);
  } finally {
    await api.close();
  }
});

test("Open tasks cannot be assigned until the later matching and response review is ready", async () => {
  const database = new TaskDatabase();
  database.tasks.push(taskRow(TASK_ID, ORG_A, "Open task"));
  const api = await startApi(database);
  try {
    const response = await fetch(`${api.url}/tasks/${TASK_ID}/status`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "Assigned" }),
    });
    assert.equal(response.status, 409);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "TASK_ASSIGNMENT_NOT_READY");
    assert.equal(database.tasks[0]?.status, "Open");
  } finally {
    await api.close();
  }
});

test("task routes require authentication, an active organization, and configured registered-organization authorization", async () => {
  const database = new TaskDatabase();
  const unauthenticated = await startApi(database, { authenticated: false });
  try {
    const response = await fetch(`${unauthenticated.url}/tasks`);
    assert.equal(response.status, 401);
  } finally {
    await unauthenticated.close();
  }

  const noOrganization = await startApi(database, { organizationId: null, organizationRole: null });
  try {
    const response = await fetch(`${noOrganization.url}/tasks`);
    assert.equal(response.status, 403);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "ORGANIZATION_MEMBERSHIP_REQUIRED");
  } finally {
    await noOrganization.close();
  }

  const inactiveMember = await startApi(database, { membership: false });
  try {
    const response = await fetch(`${inactiveMember.url}/tasks`);
    assert.equal(response.status, 403);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "ORGANIZATION_MEMBERSHIP_REQUIRED");
  } finally {
    await inactiveMember.close();
  }

  const staleRole = await startApi(database, { organizationRole: "org:member" });
  try {
    const response = await fetch(`${staleRole.url}/tasks`);
    assert.equal(response.status, 403);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "ORGANIZATION_MEMBERSHIP_REQUIRED");
  } finally {
    await staleRole.close();
  }

  const unconfigured = await startApi(database, { authorize: false });
  try {
    const response = await fetch(`${unconfigured.url}/tasks`);
    assert.equal(response.status, 503);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "TASK_AUTHORIZATION_UNAVAILABLE");
  } finally {
    await unconfigured.close();
  }
});

test("independent volunteers and denied organization-affiliated members cannot create, edit, or change task status", async () => {
  const database = new TaskDatabase();
  database.tasks.push(taskRow(TASK_ID, ORG_A, "Existing task"));
  const mutations = [
    { method: "POST", path: "/tasks", body: {
      disasterTypeId: DISASTER_ID,
      description: "New task",
      affectedLocation: { latitude: 33, longitude: 73 },
      requiredSkillIds: [SKILL_ID],
      requiredVolunteerCount: 1,
    } },
    { method: "PATCH", path: `/tasks/${TASK_ID}`, body: { description: "Edit attempt" } },
    { method: "PATCH", path: `/tasks/${TASK_ID}/status`, body: { status: "Assigned" } },
  ];

  const independentVolunteer = await startApi(database, { organizationId: null, organizationRole: null });
  try {
    for (const mutation of mutations) {
      const response = await fetch(`${independentVolunteer.url}${mutation.path}`, {
        method: mutation.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mutation.body),
      });
      assert.equal(response.status, 403);
      assert.equal((await response.json() as { error: { code: string } }).error.code, "ORGANIZATION_MEMBERSHIP_REQUIRED");
    }
  } finally {
    await independentVolunteer.close();
  }

  // This test policy represents an affiliated volunteer whose approved task
  // authorization check denies management. It does not assign a production
  // Clerk role or define the pending affiliation/permission rules.
  const affiliatedVolunteer = await startApi(database, {
    organizationRole: "org:member",
    membershipRole: "org:member",
    taskPermission: false,
  });
  try {
    for (const mutation of mutations) {
      const response = await fetch(`${affiliatedVolunteer.url}${mutation.path}`, {
        method: mutation.method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mutation.body),
      });
      assert.equal(response.status, 403);
      assert.equal((await response.json() as { error: { code: string } }).error.code, "ORGANIZATION_PERMISSION_REQUIRED");
    }
  } finally {
    await affiliatedVolunteer.close();
  }

  assert.equal(database.tasks.length, 1);
  assert.equal(database.tasks[0]?.status, "Open");
  assert.equal(database.tasks[0]?.description, "Existing task");
});

function taskRow(id: string, organizationId: string, description: string): Task {
  return {
    id,
    organization_id: organizationId,
    disaster_type_id: DISASTER_ID,
    description,
    location: "SRID=4326;POINT(73.0479 33.6844)",
    required_volunteer_count: 4,
    status: "Open",
    created_at: "2026-11-01T10:00:00.000Z",
    updated_at: "2026-11-01T10:00:00.000Z",
  };
}

function authMiddleware(options: { authenticated?: boolean; organizationId?: string | null; organizationRole?: string | null }): RequestHandler {
  return (_req, res, next) => {
    if (options.authenticated === false) {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication is required." } });
      return;
    }
    res.locals.userId = USER_ID;
    res.locals.organizationId = options.organizationId === undefined ? "clerk_org_a" : options.organizationId;
    res.locals.organizationRole = options.organizationRole === undefined ? "org:admin" : options.organizationRole;
    next();
  };
}

async function startApi(database: TaskDatabase, options: {
  authenticated?: boolean;
  organizationId?: string | null;
  organizationRole?: string | null;
  membership?: boolean;
  membershipRole?: string;
  taskPermission?: boolean;
  authorize?: boolean;
  assignmentReady?: boolean;
} = {}) {
  const app = express();
  app.use(express.json());
  app.use(createTaskRouter(
    () => database.client,
    authMiddleware(options),
    async () => options.membership === false ? [] : [{
      publicUserData: { userId: USER_ID },
      role: options.membershipRole ?? "org:admin",
    }] as unknown as OrganizationMembership[],
    options.authorize === false ? undefined : async ({ userId, clerkOrganizationId, clerkRole }) => {
      if (options.taskPermission === false) {
        throw new ApiError(403, "ORGANIZATION_PERMISSION_REQUIRED", "This member cannot manage organization tasks.");
      }
      if (userId !== USER_ID || clerkOrganizationId !== "clerk_org_a" || clerkRole !== "org:admin") {
        throw new ApiError(403, "ORGANIZATION_PERMISSION_REQUIRED", "This Clerk identity is not authorized to manage tasks for the organization.");
      }
      return { id: ORG_A };
    },
    options.assignmentReady === undefined ? undefined : async ({ organizationId, taskId }) =>
      options.assignmentReady === true && organizationId === ORG_A && taskId === TASK_ID,
  ));
  app.use(errorHandler);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed to bind a TCP port.");
  return {
    url: `http://127.0.0.1:${address.port}`,
    database,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

class TaskDatabase {
  tasks: Task[] = [];
  task_required_skills: Array<{ task_id: string; skill_id: string }> = [];
  disaster_types = [
    { id: DISASTER_ID, name: "Flood" },
    { id: "a2000000-0000-4000-8000-000000000002", name: "Earthquake" },
  ];
  skills = [
    { id: SKILL_ID, name: "First Aid" },
    { id: OTHER_SKILL_ID, name: "Logistics" },
  ];
  private counter = 10;

  client = { from: (table: string) => new TaskQuery(this, table) } as unknown as SupabaseClient;

  rows(table: string): Array<Record<string, unknown>> {
    const key = ({ disaster_tasks: "tasks" } as Record<string, string>)[table] ?? table;
    return (this as unknown as Record<string, Array<Record<string, unknown>>>)[key] ?? [];
  }

  newId() { return `a1000000-0000-4000-8000-${String(this.counter++).padStart(12, "0")}`; }
}

class TaskQuery implements PromiseLike<{ data: unknown; error: unknown }> {
  private operation: "select" | "insert" | "update" | "delete" = "select";
  private filters: Array<[string, unknown]> = [];
  private inFilters: Array<[string, unknown[]]> = [];
  private payload: Record<string, unknown> | Array<Record<string, unknown>> = {};
  private singleResult: "one" | "maybe" | null = null;
  private selected = false;
  private sortColumn: string | null = null;

  constructor(private database: TaskDatabase, private table: string) {}
  select(_columns: string) { this.selected = true; return this; }
  eq(column: string, value: unknown) { this.filters.push([column, value]); return this; }
  in(column: string, values: unknown[]) { this.inFilters.push([column, values]); return this; }
  order(column: string) { this.sortColumn = column; return this; }
  insert(value: Record<string, unknown> | Array<Record<string, unknown>>) { this.operation = "insert"; this.payload = value; return this; }
  update(value: Record<string, unknown>) { this.operation = "update"; this.payload = value; return this; }
  delete() { this.operation = "delete"; return this; }
  single() { this.singleResult = "one"; return this.execute(); }
  maybeSingle() { this.singleResult = "maybe"; return this.execute(); }
  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: unknown; error: unknown }> {
    const rows = this.database.rows(this.table);
    const matches = () => rows.filter((row) => this.filters.every(([column, value]) => row[column] === value)
      && this.inFilters.every(([column, values]) => values.includes(row[column])));
    let matched: Array<Record<string, unknown>>;

    if (this.operation === "insert") {
      const values = Array.isArray(this.payload) ? this.payload : [this.payload];
      matched = values.map((value) => {
        const now = "2026-11-01T10:00:00.000Z";
        const row = this.table === "disaster_tasks"
          ? { id: this.database.newId(), created_at: now, updated_at: now, ...value }
          : { ...value };
        rows.push(row);
        return row;
      });
    } else {
      matched = matches();
      if (this.operation === "update") matched.forEach((row) => Object.assign(row, this.payload));
      if (this.operation === "delete") {
        for (const row of matched) rows.splice(rows.indexOf(row), 1);
        matched = [];
      }
    }

    if (this.sortColumn) matched.sort((a, b) => String(b[this.sortColumn!] ?? "").localeCompare(String(a[this.sortColumn!] ?? "")));
    if (this.singleResult) {
      const first = matched[0] ?? null;
      return { data: first, error: null };
    }
    if (this.operation === "insert" && !this.selected) return { data: null, error: null };
    return { data: matched, error: null };
  }
}
