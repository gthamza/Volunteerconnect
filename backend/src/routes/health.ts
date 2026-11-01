import { Router } from "express";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RequestHandler } from "express";

export function createHealthHandler(supabase: SupabaseClient | undefined): RequestHandler {
  return async (_req, res) => {
    if (!supabase) {
      res.status(503).json({
        status: "unavailable",
        checks: { database: "unconfigured" },
      });
      return;
    }

    try {
      const { error } = await supabase.from("disaster_types").select("id").limit(0);
      if (error) {
        res.status(503).json({
          status: "unavailable",
          checks: { database: "unavailable" },
        });
        return;
      }

      res.status(200).json({ status: "ok", checks: { database: "ok" } });
    } catch {
      res.status(503).json({
        status: "unavailable",
        checks: { database: "unavailable" },
      });
    }
  };
}

export function createHealthRouter(supabase: SupabaseClient | undefined) {
  const router = Router();
  router.get("/", createHealthHandler(supabase));

  return router;
}
