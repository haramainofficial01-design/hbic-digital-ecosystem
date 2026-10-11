import { defineConfig } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: ".",
  testMatch: "quran-layout.spec.ts",
  outputDir: "../../../output/quran-web-layout/test-results",
  use: { baseURL: "http://127.0.0.1:3100", headless: true },
  webServer: {
    command: "npm --workspace @hbic/public-web run dev",
    cwd: resolve(__dirname, "../../.."),
    url: "http://127.0.0.1:3100/quran",
    // No live database credentials or provider API requests in the layout suite.
    env: { FIREBASE_PROJECT_ID: "", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "", FIREBASE_CLIENT_EMAIL: "", FIREBASE_PRIVATE_KEY: "", GOOGLE_APPLICATION_CREDENTIALS: "", GOOGLE_APPLICATION_CREDENTIALS_JSON: "", IQAMAH_CA_HBIC_SOURCE_URL: "http://127.0.0.1:3199", HBIC_PRAYER_SOURCE_URL: "http://127.0.0.1:3199" },
    reuseExistingServer: false,
    timeout: 120_000
  }
});
