import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRequireAuthenticatedUser } from "../src/middleware/authentication.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { requestLogger } from "../src/middleware/request-logger.js";
import { createHealthHandler } from "../src/routes/health.js";

type TestBody = {
  error?: { code?: string; message?: string };
  status?: string;
  checks?: { database?: string };
};

test("health handler reports a successful Supabase query", async () => {
  const response = createResponse();
  await createHealthHandler(healthySupabase())(createRequest(), response, () => undefined);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    status: "ok",
    checks: { database: "ok" },
  });
});

test("health handler reports an unconfigured database as unavailable", async () => {
  const response = createResponse();
  await createHealthHandler(undefined)(createRequest(), response, () => undefined);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    status: "unavailable",
    checks: { database: "unconfigured" },
  });
});

test("health handler hides Supabase error details", async () => {
  const supabase = {
    from: () => ({
      select: () => ({ limit: async () => ({ error: { message: "private database detail" } }) }),
    }),
  } as unknown as SupabaseClient;
  const response = createResponse();

  await createHealthHandler(supabase)(createRequest(), response, () => undefined);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, {
    status: "unavailable",
    checks: { database: "unavailable" },
  });
  assert.doesNotMatch(JSON.stringify(response.body), /private database detail/);
});

test("authentication middleware rejects requests without a verified session", () => {
  const response = createResponse();
  let nextCalled = false;
  const middleware = createRequireAuthenticatedUser(() => ({
    isAuthenticated: false,
    userId: null,
  }) as ReturnType<typeof import("@clerk/express").getAuth>);

  middleware(createRequest(), response, () => { nextCalled = true; });
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error?.code, "UNAUTHORIZED");
  assert.equal(nextCalled, false);
});

test("authentication middleware stores only the verified Clerk user ID", () => {
  const response = createResponse();
  let nextCalled = false;
  const middleware = createRequireAuthenticatedUser(() => ({
    isAuthenticated: true,
    userId: "user_verified_123",
  }) as ReturnType<typeof import("@clerk/express").getAuth>);

  middleware(createRequest(), response, () => { nextCalled = true; });
  assert.equal(response.locals.userId, "user_verified_123");
  assert.equal(nextCalled, true);
});

test("request logger adds a request ID and excludes query strings", () => {
  const request = createRequest({ method: "GET", path: "/health", query: { token: "not-for-logs" } });
  const response = createResponse();
  let finishHandler: (() => void) | undefined;

  requestLogger(request, response, () => undefined);
  finishHandler = response.finishHandler;
  assert.match(response.headers["X-Request-Id"], /^[0-9a-f-]{36}$/i);
  assert.equal(response.locals.requestId, response.headers["X-Request-Id"]);
  assert.ok(finishHandler);
  let log = "";
  const originalInfo = console.info;
  try {
    console.info = (message?: unknown) => { log = String(message); };
    finishHandler();
  } finally {
    console.info = originalInfo;
  }
  assert.equal(JSON.parse(log).requestId, response.locals.requestId);
  assert.doesNotMatch(log, /not-for-logs/);
});

test("error handler maps malformed JSON to a safe 400 response", () => {
  const response = createResponse();
  const request = createRequest({ method: "POST", path: "/health" });

  errorHandler({ status: 400, type: "entity.parse.failed", message: "includes submitted body" }, request, response, () => undefined);
  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body.error, {
    code: "BAD_REQUEST",
    message: "The request could not be parsed.",
  });
  assert.doesNotMatch(JSON.stringify(response.body), /submitted body/);
});

test("error handler reports oversized bodies and does not expose internal exceptions", () => {
  const response = createResponse();
  errorHandler({ status: 413, type: "entity.too.large" }, createRequest(), response, () => undefined);
  assert.equal(response.statusCode, 413);
  assert.equal(response.body.error?.code, "PAYLOAD_TOO_LARGE");

  const internalResponse = createResponse();
  errorHandler(new Error("secret connection detail"), createRequest(), internalResponse, () => undefined);
  assert.equal(internalResponse.statusCode, 500);
  assert.equal(internalResponse.body.error?.code, "INTERNAL_SERVER_ERROR");
  assert.doesNotMatch(JSON.stringify(internalResponse.body), /secret connection detail/);
});

function healthySupabase(): SupabaseClient {
  return {
    from: () => ({
      select: () => ({ limit: async () => ({ error: null }) }),
    }),
  } as unknown as SupabaseClient;
}

function createRequest(values: Partial<Request> = {}): Request {
  return {
    method: "GET",
    path: "/health",
    query: {},
    ...values,
  } as Request;
}

function createResponse() {
  const response = {
    statusCode: 200,
    headersSent: false,
    body: {} as TestBody,
    headers: {} as Record<string, string>,
    locals: {} as Record<string, unknown>,
    finishHandler: undefined as (() => void) | undefined,
    status(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    json(body: TestBody) {
      this.body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    once(event: string, handler: () => void) {
      if (event === "finish") this.finishHandler = handler;
      return this;
    },
  };
  return response as unknown as Response & typeof response;
}
