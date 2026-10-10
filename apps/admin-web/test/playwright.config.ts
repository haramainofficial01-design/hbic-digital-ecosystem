import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: ".",
  testMatch: "workspace-layout.spec.ts",
  outputDir: "../../../output/admin-workspace-layout/test-results",
  use: { headless: true, viewport: { width: 1440, height: 720 } },
  webServer: {
    command: "npm --workspace @hbic/admin-web run dev",
    cwd: resolve(__dirname, "../../.."),
    env: { NEXT_PUBLIC_API_URL: "http://127.0.0.1:3199" },
    url: "http://127.0.0.1:3101",
    reuseExistingServer: !process.env.CI
  }
});
