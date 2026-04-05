import type { NextFunction, Response } from "express";
import { createUserClient, supabaseAuthClient } from "../lib/supabase.js";
import type { AppRole, AuthenticatedRequest } from "../types/auth.js";

function extractBearerToken(headerValue?: string): string | null {
  if (!headerValue) return null;
  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

async function resolveRole(token: string, userId: string): Promise<AppRole> {
  const client = createUserClient(token);
  const { data, error } = await client.rpc("get_user_role", { _user_id: userId });
  if (error || !data) return "viewer";
  return data as AppRole;
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const token = extractBearerToken(req.header("authorization"));

  if (!token) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const { data, error } = await supabaseAuthClient.auth.getUser(token);
  if (error || !data.user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }

  const role = await resolveRole(token, data.user.id);
  req.auth = {
    user: {
      id: data.user.id,
      email: data.user.email,
    },
    role,
    token,
  };

  next();
}

export function requireRole(minRole: AppRole) {
  const rank: Record<AppRole, number> = { viewer: 1, analyst: 2, admin: 3 };

  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.auth) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (rank[req.auth.role] < rank[minRole]) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    next();
  };
}
