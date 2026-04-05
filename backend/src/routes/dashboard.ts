import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createUserClient } from "../lib/supabase.js";
import type { AuthenticatedRequest } from "../types/auth.js";

export const dashboardRouter = Router();

dashboardRouter.get("/dashboard", requireAuth, async (req: AuthenticatedRequest, res) => {
  const client = createUserClient(req.auth!.token);

  const [summaryResult, trendsResult, categoriesResult, recentResult] = await Promise.all([
    client.rpc("get_dashboard_summary"),
    client.rpc("get_monthly_trends"),
    client.rpc("get_category_summary"),
    client.rpc("get_recent_activity", { limit_count: 10 }),
  ]);

  if (summaryResult.error) {
    res.status(500).json({ error: summaryResult.error.message });
    return;
  }

  if (trendsResult.error) {
    res.status(500).json({ error: trendsResult.error.message });
    return;
  }

  if (categoriesResult.error) {
    res.status(500).json({ error: categoriesResult.error.message });
    return;
  }

  if (recentResult.error) {
    res.status(500).json({ error: recentResult.error.message });
    return;
  }

  res.json({
    summary: summaryResult.data,
    trends: (trendsResult.data as unknown[] | null) ?? [],
    categories: (categoriesResult.data as unknown[] | null) ?? [],
    recent: (recentResult.data as unknown[] | null) ?? [],
  });
});
