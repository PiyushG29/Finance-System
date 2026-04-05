import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  use: {
    baseURL: "http://localhost:8080",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx vite --host 127.0.0.1 --port 8080",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
