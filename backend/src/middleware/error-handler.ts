import type { ErrorRequestHandler } from "express";

const clientErrorResponses: Record<number, { code: string; message: string }> = {
  400: { code: "BAD_REQUEST", message: "The request could not be parsed." },
  401: { code: "UNAUTHORIZED", message: "Authentication is required." },
  403: { code: "FORBIDDEN", message: "You are not allowed to perform this request." },
  404: { code: "NOT_FOUND", message: "The requested resource was not found." },
  413: { code: "PAYLOAD_TOO_LARGE", message: "The request body is too large." },
  415: { code: "UNSUPPORTED_MEDIA_TYPE", message: "The request content type is not supported." },
  429: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Try again later." },
};

export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status = getHttpStatus(error);
  const clientResponse = status < 500 ? clientErrorResponses[status] : undefined;
  const requestId = res.locals.requestId as string | undefined;

  if (status >= 500) {
    console.error(JSON.stringify({
      level: "error",
      event: "unhandled_request_error",
      requestId,
      method: req.method,
      path: req.path,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorType: getErrorType(error),
    }));
  }

  const response = clientResponse ?? (status < 500
    ? { code: "REQUEST_ERROR", message: "The request could not be completed." }
    : { code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred." });
  res.status(status).json({
    error: response,
    ...(requestId ? { requestId } : {}),
  });
};

function getHttpStatus(error: unknown): number {
  if (!error || typeof error !== "object") return 500;
  const candidate = "status" in error ? error.status : "statusCode" in error ? error.statusCode : undefined;
  return typeof candidate === "number" && Number.isInteger(candidate) && candidate >= 400 && candidate <= 599
    ? candidate
    : 500;
}

function getErrorType(error: unknown): string | undefined {
  if (!error || typeof error !== "object" || !("type" in error)) return undefined;
  return typeof error.type === "string" ? error.type : undefined;
}
