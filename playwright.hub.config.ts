import { defineConfig } from "@playwright/test";

// Marketing site only: no global setup, so nothing reads or writes the database. Run against a dev server or a production build:
//   PLAYWRIGHT_BASE_URL=http://localhost:3100 npx playwright test -c playwright.hub.config.ts
export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: ["hub-and-spoke.spec.ts"],
  workers: 2,
  reporter: "line",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    channel: "msedge",
    contextOptions: { reducedMotion: "reduce" },
    actionTimeout: 20_000,
  },
});
