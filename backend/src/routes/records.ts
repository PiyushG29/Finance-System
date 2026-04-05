import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { createUserClient } from "../lib/supabase.js";
import type { AuthenticatedRequest } from "../types/auth.js";

export const recordsRouter = Router();

const recordSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  record_date: z.string().date(),
  notes: z.string().max(1000).nullable().optional(),
});

recordsRouter.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  const page = Math.max(1, Number(req.query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const client = createUserClient(req.auth!.token);
  let query = client
    .from("financial_records")
    .select("id,user_id,amount,type,category,record_date,notes,created_at,updated_at", { count: "exact" })
    .is("deleted_at", null)
    .order("record_date", { ascending: false })
    .range(from, to);

  if (typeof req.query.type === "string" && req.query.type !== "all") {
    query = query.eq("type", req.query.type);
  }
  if (typeof req.query.category === "string" && req.query.category !== "all") {
    query = query.eq("category", req.query.category);
  }
  if (typeof req.query.search === "string" && req.query.search.trim()) {
    query = query.ilike("notes", `%${req.query.search.trim()}%`);
  }
  if (typeof req.query.date === "string" && req.query.date.trim()) {
    query = query.eq("record_date", req.query.date.trim());
  }

  const { data, error, count } = await query;
  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ page, limit, total: count ?? 0, records: data ?? [] });
});

recordsRouter.post("/", requireAuth, requireRole("analyst"), async (req: AuthenticatedRequest, res) => {
  const parsed = recordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const client = createUserClient(req.auth!.token);
  const { data, error } = await client
    .from("financial_records")
    .insert({ ...parsed.data, user_id: req.auth!.user.id })
    .select("id,user_id,amount,type,category,record_date,notes,created_at,updated_at")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(201).json({ record: data });
});

recordsRouter.patch("/:id", requireAuth, requireRole("analyst"), async (req: AuthenticatedRequest, res) => {
  const parsed = recordSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const client = createUserClient(req.auth!.token);
  const { data, error } = await client
    .from("financial_records")
    .update(parsed.data)
    .eq("id", req.params.id)
    .is("deleted_at", null)
    .select("id,user_id,amount,type,category,record_date,notes,created_at,updated_at")
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ record: data });
});

recordsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req: AuthenticatedRequest, res) => {
  const client = createUserClient(req.auth!.token);
  const { error } = await client
    .from("financial_records")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", req.params.id)
    .is("deleted_at", null);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.status(204).send();
});
