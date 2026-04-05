import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createUserClient } from "../lib/supabase.js";
import type { AuthenticatedRequest } from "../types/auth.js";

export const adminRouter = Router();

const roleSchema = z.object({
  role: z.enum(["viewer", "analyst", "admin"]),
});

const statusSchema = z.object({
  status: z.enum(["active", "inactive"]),
});

adminRouter.get("/users", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
  const client = createUserClient(req.auth!.token);

  const [{ data: profiles, error: profilesError }, { data: roles, error: rolesError }] = await Promise.all([
    client.from("profiles").select("user_id, display_name, email, status, created_at"),
    client.from("user_roles").select("id, user_id, role"),
  ]);

  if (profilesError) {
    res.status(500).json({ error: profilesError.message });
    return;
  }

  if (rolesError) {
    res.status(500).json({ error: rolesError.message });
    return;
  }

  const roleMap = new Map((roles ?? []).map((row) => [row.user_id, { role: row.role, role_id: row.id }]));

  res.json({
    users: (profiles ?? []).map((profile) => ({
      user_id: profile.user_id,
      username: profile.display_name ?? profile.email?.split("@")[0] ?? null,
      display_name: profile.display_name,
      email: profile.email,
      status: profile.status,
      created_at: profile.created_at,
      role: roleMap.get(profile.user_id)?.role ?? "viewer",
      role_id: roleMap.get(profile.user_id)?.role_id ?? "",
    })),
  });
});

adminRouter.patch("/users/:userId/role", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const client = createUserClient(req.auth!.token);
  const { data: existingRole, error: existingRoleError } = await client
    .from("user_roles")
    .select("id")
    .eq("user_id", req.params.userId)
    .maybeSingle();

  if (existingRoleError) {
    res.status(500).json({ error: existingRoleError.message });
    return;
  }

  if (existingRole?.id) {
    const { error } = await client.from("user_roles").update({ role: parsed.data.role, assigned_by: req.auth!.user.id }).eq("id", existingRole.id);
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  } else {
    const { error } = await client.from("user_roles").insert({ user_id: req.params.userId, role: parsed.data.role, assigned_by: req.auth!.user.id });
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
  }

  res.json({ success: true });
});

adminRouter.patch("/users/:userId/status", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const client = createUserClient(req.auth!.token);
  const { error } = await client.from("profiles").update({ status: parsed.data.status }).eq("user_id", req.params.userId);
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ success: true });
});
