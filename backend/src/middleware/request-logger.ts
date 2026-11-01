import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";

/** Logs request metadata only; never records headers, query strings, or bodies. */
export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);
  const startedAt = Date.now();
  res.once("finish", () => {
    console.info(JSON.stringify({
      level: "info",
      event: "http_request",
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });
  next();
};
