import { Router } from "express";
import { env } from "../config/env.js";

export const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "finance-system-wrapper-backend",
    environment: env.nodeEnv,
    timestamp: new Date().toISOString(),
  });
});
