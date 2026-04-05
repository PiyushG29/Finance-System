import type { Request } from "express";

export type AppRole = "viewer" | "analyst" | "admin";

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  role: AppRole;
  token: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}
