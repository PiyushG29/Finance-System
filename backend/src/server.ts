import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { recordsRouter } from "./routes/records.js";
import { adminRouter } from "./routes/admin.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api", dashboardRouter);
app.use("/api/records", recordsRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(env.port, () => {
  console.log(`Backend wrapper running on http://localhost:${env.port}`);
});
