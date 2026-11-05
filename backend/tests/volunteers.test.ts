import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import express, { type RequestHandler } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { OrganizationMembership } from "@clerk/express";
import { errorHandler } from "../src/middleware/error-handler.js";
import { createVolunteerRouter } from "../src/routes/volunteers.js";

const USER_ID = "user_verified_volunteer";
const PROFILE_ID = "10000000-0000-4000-8000-000000000001";
const SKILL_ID = "20000000-0000-4000-8000-000000000001";
const DISASTER_ID = "30000000-0000-4000-8000-000000000001";

test("protected profile routes reject unauthenticated requests", async () => {
  const { baseUrl, close } = await startApi({ authenticated: false });
  try {
    const response = await fetch(`${baseUrl}/volunteers/me`);
    assert.equal(response.status, 401);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "UNAUTHORIZED");
  } finally {
    await close();
  }
});

test("profile creation and retrieval use the verified identity and return only profile fields", async () => {
  const { baseUrl, close } = await startApi();
  try {
    const created = await fetch(`${baseUrl}/volunteers/me`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clerkUserId: "user_attacker_controlled" }),
    });
    assert.equal(created.status, 400, "client supplied identity is rejected by strict Zod validation");

    const response = await fetch(`${baseUrl}/volunteers/me`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 201);
    const body = await response.json() as { data: { id: string; localAreaKnowledge: boolean | null } };
    assert.equal(body.data.id, PROFILE_ID);
    assert.equal(body.data.localAreaKnowledge, null);

    const retrieved = await fetch(`${baseUrl}/volunteers/me`);
    assert.equal(retrieved.status, 200);
    assert.equal((await retrieved.json() as { data: { id: string } }).data.id, PROFILE_ID);
  } finally {
    await close();
  }
});

test("profile updates validate fields and update only the caller's local knowledge setting", async () => {
  const { baseUrl, close, database } = await startApi();
  try {
    await fetch(`${baseUrl}/volunteers/me`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const invalid = await fetch(`${baseUrl}/volunteers/me`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "private@example.com" }),
    });
    assert.equal(invalid.status, 400);

    const response = await fetch(`${baseUrl}/volunteers/me`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ localAreaKnowledge: true }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json() as { data: { localAreaKnowledge: boolean } }).data.localAreaKnowledge, true);
    assert.equal(database.profiles[0]?.app_user_id, database.users[0]?.id);

    const invalidLocation = await fetch(`${baseUrl}/volunteers/me`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ location: { latitude: 91, longitude: 0 } }),
    });
    assert.equal(invalidLocation.status, 400);

    const locationResponse = await fetch(`${baseUrl}/volunteers/me`, {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ location: { latitude: 33.6844, longitude: 73.0479 } }),
    });
    assert.equal(locationResponse.status, 200);
    const locationBody = await locationResponse.json() as { data: { location: { latitude: number; longitude: number } | null } };
    assert.deepEqual(locationBody.data.location, { latitude: 33.6844, longitude: 73.0479 });
    assert.equal(database.profiles[0]?.location, "SRID=4326;POINT(73.0479 33.6844)");

    const clearLocation = await fetch(`${baseUrl}/volunteers/me`, {
      method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ location: null }),
    });
    assert.equal(clearLocation.status, 200);
    assert.equal(database.profiles[0]?.location, null);
  } finally {
    await close();
  }
});

test("catalogues expose supported records and skill association writes reject unlisted IDs", async () => {
  const { baseUrl, close } = await startApi();
  try {
    const skills = await fetch(`${baseUrl}/volunteer-skills`);
    assert.equal(skills.status, 200);
    assert.deepEqual((await skills.json() as { data: unknown[] }).data, [{ id: SKILL_ID, name: "First Aid" }]);

    const disasters = await fetch(`${baseUrl}/disaster-types`);
    assert.equal(disasters.status, 200);
    assert.deepEqual((await disasters.json() as { data: unknown[] }).data, [
      { id: DISASTER_ID, name: "Flood" },
      { id: "30000000-0000-4000-8000-000000000003", name: "Earthquake" },
    ]);

    await fetch(`${baseUrl}/volunteers/me`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const invalid = await fetch(`${baseUrl}/volunteers/me/skills`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ skillIds: ["40000000-0000-4000-8000-000000000001"] }),
    });
    assert.equal(invalid.status, 400);
    assert.equal((await invalid.json() as { error: { code: string } }).error.code, "INVALID_SKILL");
  } finally {
    await close();
  }
});

test("volunteers can add and remove skills and disaster type preferences", async () => {
  const { baseUrl, close, database } = await startApi();
  try {
    await fetch(`${baseUrl}/volunteers/me`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    const addSkills = await fetch(`${baseUrl}/volunteers/me/skills`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ skillIds: [SKILL_ID] }),
    });
    assert.equal(addSkills.status, 200);
    await fetch(`${baseUrl}/volunteers/me/skills`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ skillIds: [SKILL_ID] }),
    });
    assert.deepEqual(database.volunteer_skills, [{ volunteer_profile_id: PROFILE_ID, skill_id: SKILL_ID }]);

    const addDisaster = await fetch(`${baseUrl}/volunteers/me/disaster-types`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ disasterTypeIds: [DISASTER_ID] }),
    });
    assert.equal(addDisaster.status, 200);
    await fetch(`${baseUrl}/volunteers/me/disaster-types`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ disasterTypeIds: [DISASTER_ID] }),
    });
    assert.deepEqual(database.volunteer_disaster_types, [{ volunteer_profile_id: PROFILE_ID, disaster_type_id: DISASTER_ID }]);

    const removeSkill = await fetch(`${baseUrl}/volunteers/me/skills/${SKILL_ID}`, { method: "DELETE" });
    assert.equal(removeSkill.status, 200);
    assert.deepEqual(database.volunteer_skills, []);

    const removeDisaster = await fetch(`${baseUrl}/volunteers/me/disaster-types/${DISASTER_ID}`, { method: "DELETE" });
    assert.equal(removeDisaster.status, 200);
    assert.deepEqual(database.volunteer_disaster_types, []);
  } finally {
    await close();
  }
});

test("organization volunteer reads require an active Clerk organization", async () => {
  const { baseUrl, close } = await startApi();
  try {
    const response = await fetch(`${baseUrl}/organizations/me/volunteers`);
    assert.equal(response.status, 403);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "ORGANIZATION_MEMBERSHIP_REQUIRED");
  } finally {
    await close();
  }
});

test("organization members see only volunteer profiles connected to Clerk members of their organization", async () => {
  const { baseUrl, close } = await startOrganizationApi();
  try {
    const list = await fetch(`${baseUrl}/organizations/me/volunteers`);
    assert.equal(list.status, 200);
    const body = await list.json() as { data: Array<{ id: string; name: string; localAreaKnowledge: boolean | null; location?: unknown }> };
    assert.equal(body.data.length, 1);
    assert.equal(body.data[0]?.id, PROFILE_ID);
    assert.equal(body.data[0]?.name, "Amina Khan");
    assert.equal(body.data[0]?.localAreaKnowledge, true);
    assert.equal("location" in (body.data[0] ?? {}), false, "precise location is not exposed to organizations");

    const own = await fetch(`${baseUrl}/organizations/me/volunteers/${PROFILE_ID}`);
    assert.equal(own.status, 200);
    const foreign = await fetch(`${baseUrl}/organizations/me/volunteers/10000000-0000-4000-8000-000000000099`);
    assert.equal(foreign.status, 404, "profiles outside the Clerk organization roster are not discoverable");
  } finally {
    await close();
  }
});

test("organization roles outside the supported member and administrator roles are denied", async () => {
  const { baseUrl, close } = await startOrganizationApi("org:limited");
  try {
    const response = await fetch(`${baseUrl}/organizations/me/volunteers`);
    assert.equal(response.status, 403);
    assert.equal((await response.json() as { error: { code: string } }).error.code, "ORGANIZATION_PERMISSION_REQUIRED");
  } finally {
    await close();
  }
});

function authMiddleware(authenticated: boolean, organizationId?: string, organizationRole?: string): RequestHandler {
  return (_req, res, next) => {
    if (authenticated) {
      res.locals.userId = USER_ID;
      res.locals.organizationId = organizationId ?? null;
      res.locals.organizationRole = organizationRole ?? null;
    }
    else {
      res.status(401).json({ error: { code: "UNAUTHORIZED", message: "Authentication is required." } });
      return;
    }
    next();
  };
}

async function startApi(options: { authenticated?: boolean } = {}) {
  const database = new MemoryDatabase();
  const app = express();
  app.use(express.json());
  app.use(createVolunteerRouter(() => database.client, authMiddleware(options.authenticated ?? true)));
  app.use(errorHandler);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed to bind a TCP port.");
  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    database,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}

async function startOrganizationApi(role = "org:member") {
  const database = new MemoryDatabase();
  database.users.push({ id: "app-user-a", clerk_user_id: "user_org_a" }, { id: "app-user-b", clerk_user_id: "user_org_b" });
  database.profiles.push(
    { id: PROFILE_ID, app_user_id: "app-user-a", location: "SRID=4326;POINT(73 33)", local_area_knowledge: true, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
    { id: "10000000-0000-4000-8000-000000000099", app_user_id: "app-user-b", location: null, local_area_knowledge: false, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" },
  );
  const memberships = [{ publicUserData: { userId: "user_org_a", firstName: "Amina", lastName: "Khan" }, role: "org:member" }] as OrganizationMembership[];
  const app = express();
  app.use(express.json());
  app.use(createVolunteerRouter(() => database.client, authMiddleware(true, "org_current", role), async () => memberships));
  app.use(errorHandler);
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server failed to bind a TCP port.");
  return { baseUrl: `http://127.0.0.1:${address.port}`, close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}

class MemoryDatabase {
  users: Array<{ id: string; clerk_user_id: string }> = [];
  profiles: Array<{ id: string; app_user_id: string; location: string | null; local_area_knowledge: boolean | null; created_at: string; updated_at: string }> = [];
  skills = [{ id: SKILL_ID, name: "First Aid" }];
  disaster_types = [
    { id: DISASTER_ID, name: "Flood" },
    { id: "30000000-0000-4000-8000-000000000003", name: "Earthquake" },
    { id: "30000000-0000-4000-8000-000000000002", name: "Tornado" },
  ];
  volunteer_skills: Array<{ volunteer_profile_id: string; skill_id: string }> = [];
  volunteer_disaster_types: Array<{ volunteer_profile_id: string; disaster_type_id: string }> = [];
  private userCounter = 1;
  private profileCounter = 1;

  client = {
    from: (table: string) => new MemoryQuery(this, table),
  } as unknown as SupabaseClient;

  nextUserId() { return `app-user-${this.userCounter++}`; }
  nextProfileId() { return this.profileCounter++ === 1 ? PROFILE_ID : `10000000-0000-4000-8000-${String(this.profileCounter).padStart(12, "0")}`; }
}

class MemoryQuery implements PromiseLike<{ data: unknown; error: unknown }> {
  private operation: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private filters: Array<[string, unknown]> = [];
  private included: Array<[string, unknown[]]> = [];
  private payload: Record<string, unknown> | Array<Record<string, unknown>> = {};
  private singleResult = false;

  constructor(private db: MemoryDatabase, private table: string) {}
  select(_fields: string) { return this; }
  eq(column: string, value: unknown) { this.filters.push([column, value]); return this; }
  in(column: string, values: unknown[]) { this.included.push([column, values]); return this; }
  order(_column: string) { return this; }
  insert(value: Record<string, unknown>) { this.operation = "insert"; this.payload = value; return this; }
  upsert(value: Record<string, unknown> | Array<Record<string, unknown>>, _options?: unknown) { this.operation = "upsert"; this.payload = value; return this; }
  update(value: Record<string, unknown>) { this.operation = "update"; this.payload = value; return this; }
  delete() { this.operation = "delete"; return this; }
  single() { this.singleResult = true; return this.execute(); }
  maybeSingle() { this.singleResult = true; return this.execute(); }
  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute(): Promise<{ data: unknown; error: unknown }> {
    const rows = this.tableRows();
    const values = Array.isArray(this.payload) ? this.payload : [this.payload];
    let matched = rows.filter((row) => this.filters.every(([column, value]) => row[column] === value)
      && this.included.every(([column, choices]) => choices.includes(row[column])));
    if (this.operation === "insert") {
      matched = values.map((value) => {
        const row = { ...value };
        if (this.table === "volunteer_profiles") {
          Object.assign(row, { id: this.db.nextProfileId(), location: null, local_area_knowledge: null, created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" });
        }
        rows.push(row);
        return row;
      });
    } else if (this.operation === "upsert") {
      matched = values.map((value) => {
        if (this.table === "app_users") {
          const existing = rows.find((row) => row.clerk_user_id === value.clerk_user_id);
          if (existing) return existing;
          const row = { id: this.db.nextUserId(), ...value };
          rows.push(row);
          return row;
        }
        if (this.table === "volunteer_skills" || this.table === "volunteer_disaster_types") {
          const associationId = this.table === "volunteer_skills" ? "skill_id" : "disaster_type_id";
          const existing = rows.find((row) => row.volunteer_profile_id === value.volunteer_profile_id && row[associationId] === value[associationId]);
          if (existing) return existing;
        }
        rows.push(value);
        return value;
      });
    } else if (this.operation === "update") {
      matched.forEach((row) => Object.assign(row, this.payload));
    } else if (this.operation === "delete") {
      const target = rows as Array<Record<string, unknown>>;
      for (const row of matched) target.splice(target.indexOf(row), 1);
      matched = [];
    }
    return { data: this.singleResult ? (matched[0] ?? null) : matched, error: null };
  }

  private tableRows(): Array<Record<string, unknown>> {
    const key = ({ app_users: "users", volunteer_profiles: "profiles" } as Record<string, string>)[this.table] ?? this.table;
    return (this.db as unknown as Record<string, Array<Record<string, unknown>>>)[key] ?? [];
  }
}
