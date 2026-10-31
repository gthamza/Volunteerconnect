/** Development diagnostics. Never pass tokens, emails, or user supplied values here. */
export function debugLog(scope: string, event: string, details?: Record<string, unknown>) {
  if (!__DEV__) return;
  console.log(`[VC:${scope}] ${event}`, details ?? "");
}

export function debugWarn(scope: string, event: string, details?: Record<string, unknown>) {
  if (!__DEV__) return;
  console.warn(`[VC:${scope}] ${event}`, details ?? "");
}

export function debugError(scope: string, event: string, error: unknown) {
  if (!__DEV__) return;
  const safeError = error instanceof Error
    ? { name: error.name, message: redact(error.message) }
    : { type: typeof error };
  console.error(`[VC:${scope}] ${event}`, safeError);
}

function redact(value: string) {
  return value
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[email]")
    .replace(/eyJ[\w-]*\.[\w-]*\.[\w-]*/g, "[token]")
    .replace(/\b((?:pk|sk)_(?:test|live)_)\S+/g, "$1[redacted]")
    .replace(/([?&](?:code|token|nonce|state)=)[^&\s]+/gi, "$1[redacted]");
}
