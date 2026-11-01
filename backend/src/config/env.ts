import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  CLERK_SECRET_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url("SUPABASE_URL must be a valid URL").optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  CORS_ORIGINS: z.string().default(""),
}).superRefine((config, context) => {
  if (config.SUPABASE_URL && !config.SUPABASE_SERVICE_ROLE_KEY) {
    context.addIssue({
      code: "custom",
      path: ["SUPABASE_SERVICE_ROLE_KEY"],
      message: "is required when SUPABASE_URL is configured",
    });
  }
  if (config.SUPABASE_SERVICE_ROLE_KEY && !config.SUPABASE_URL) {
    context.addIssue({
      code: "custom",
      path: ["SUPABASE_URL"],
      message: "is required when SUPABASE_SERVICE_ROLE_KEY is configured",
    });
  }
  if (config.NODE_ENV === "production") {
    for (const [key, value] of [
      ["CLERK_SECRET_KEY", config.CLERK_SECRET_KEY],
      ["SUPABASE_URL", config.SUPABASE_URL],
      ["SUPABASE_SERVICE_ROLE_KEY", config.SUPABASE_SERVICE_ROLE_KEY],
    ] as const) {
      if (!value) {
        context.addIssue({ code: "custom", path: [key], message: "is required in production" });
      }
    }
  }
});

export type BackendConfig = {
  nodeEnv: "development" | "test" | "production";
  port: number;
  clerkSecretKey?: string;
  supabaseUrl?: string;
  supabaseServiceRoleKey?: string;
  corsOrigins: string[];
};

export function loadConfig(source: NodeJS.ProcessEnv = process.env): BackendConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
    throw new Error(`Invalid backend environment configuration: ${problems.join("; ")}`);
  }

  const corsOrigins = parsed.data.CORS_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    clerkSecretKey: parsed.data.CLERK_SECRET_KEY,
    supabaseUrl: parsed.data.SUPABASE_URL,
    supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY,
    corsOrigins,
  };
}
