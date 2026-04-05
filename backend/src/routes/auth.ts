import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { createAdminClient, createUserClient } from "../lib/supabase.js";
import type { AuthenticatedRequest } from "../types/auth.js";

export const authRouter = Router();

authRouter.post("/resolve-login", async (req, res) => {
  const identifier = String(req.body?.identifier ?? "").trim();

  if (!identifier) {
    res.status(400).json({ error: "Identifier is required" });
    return;
  }

  try {
    const adminClient = createAdminClient();
    const { data, error } = await adminClient
      .from("profiles")
      .select("user_id, display_name, email");

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    const lowered = identifier.toLowerCase();
    const match = (data ?? []).find((profile) => {
      const displayName = profile.display_name?.toLowerCase() ?? "";
      const email = profile.email?.toLowerCase() ?? "";
      const emailPrefix = email.split("@")[0] ?? "";
      return displayName === lowered || email === lowered || emailPrefix === lowered;
    }) ?? null;

    res.json({
      email: match?.email ?? null,
      username: match?.display_name ?? match?.email?.split("@")[0] ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Username lookup unavailable";
    res.status(503).json({ error: message });
  }
});

authRouter.get("/me", requireAuth, async (req: AuthenticatedRequest, res) => {
  const client = createUserClient(req.auth!.token);
  const { data: profile } = await client
    .from("profiles")
    .select("display_name, email")
    .eq("user_id", req.auth!.user.id)
    .maybeSingle();

  res.json({
    user: req.auth?.user,
    role: req.auth?.role,
    profile: {
      username: profile?.display_name ?? profile?.email?.split("@")[0] ?? null,
      display_name: profile?.display_name ?? null,
    },
  });
});
