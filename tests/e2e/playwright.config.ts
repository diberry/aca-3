import { defineConfig, devices } from "@playwright/test";

const shellOrigin = "http://127.0.0.1:4100";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.pw.ts",
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  outputDir: "../../test-results/e2e",
  use: {
    baseURL: shellOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: `${shellOrigin}/__local/auth/context`,
    timeout: 60_000,
    reuseExistingServer: false,
    env: {
      ACA_ENVIRONMENT: "local",
      LOCAL_DEV_AUTH_ENABLED: "true",
      LOCAL_DEV_USER_NAME: "Playwright Local Author",
    },
  },
});
