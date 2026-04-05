import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUiDist from "swagger-ui-dist";
import { env } from "./config/env.js";
import { openApiSpec } from "./docs/openapi.js";
import { healthRouter } from "./routes/health.js";
import { authRouter } from "./routes/auth.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { recordsRouter } from "./routes/records.js";
import { adminRouter } from "./routes/admin.js";

const app = express();

app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.use("/api/docs-assets", express.static(swaggerUiDist.getAbsoluteFSPath()));

app.get("/api/openapi.json", (_req, res) => {
  res.json(openApiSpec);
});

const swaggerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Finance System Backend API Docs</title>
    <link rel="stylesheet" href="/api/docs-assets/swagger-ui.css" />
    <style>
      html, body { margin: 0; padding: 0; background: #f8fafc; }
      #swagger-ui { min-height: 100vh; }
      .topbar { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/api/docs-assets/swagger-ui-bundle.js"></script>
    <script src="/api/docs-assets/swagger-ui-standalone-preset.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: '/api/openapi.json',
          dom_id: '#swagger-ui',
          deepLinking: true,
          displayRequestDuration: true,
          persistAuthorization: true,
          layout: 'BaseLayout',
          presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
        });
      };
    </script>
  </body>
</html>`;

app.get("/api/docs", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(swaggerHtml);
});

app.get("/api/docs/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(swaggerHtml);
});

app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api", dashboardRouter);
app.use("/api/records", recordsRouter);
app.use("/api/admin", adminRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

export default app;