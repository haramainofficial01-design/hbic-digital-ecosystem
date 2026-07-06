import { chromium, type Browser, type Page } from "@playwright/test";
import { defaultContent, publicRevalidationPaths, type HbicContent } from "@hbic/shared";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { existsSync } from "fs";
import { copyFile, mkdir, rename } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputDir = join(rootDir, "demo-recordings", "output");
const outputPath = join(outputDir, "hbic-admin-dashboard-demo.webm");
const adminUrl = process.env.ADMIN_SITE_URL || "http://127.0.0.1:3101";
const viewport = { width: 1440, height: 1000 };

let draftContent: HbicContent = JSON.parse(JSON.stringify(defaultContent));

async function isReachable(url: string) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForUrl(url: string, timeoutMs = 90_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await isReachable(url)) return;
    await new Promise((resolveWait) => setTimeout(resolveWait, 1_000));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function startAdminServer(): Promise<ChildProcessWithoutNullStreams | null> {
  if (process.env.ADMIN_SITE_URL) return null;
  if (await isReachable(adminUrl)) return null;

  const child = spawn("npm", ["run", "dev:admin"], {
    cwd: rootDir,
    env: {
      ...process.env,
      NEXT_PUBLIC_API_URL: "https://hbic-demo-recording.local"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", () => undefined);
  child.stderr.on("data", () => undefined);
  return child;
}

async function launchBrowser(): Promise<Browser> {
  const preferredChannel = process.env.PLAYWRIGHT_CHANNEL || "chrome";
  try {
    return await chromium.launch({ headless: true, channel: preferredChannel });
  } catch {
    return chromium.launch({ headless: true });
  }
}

async function installSafeApiMocks(page: Page) {
  await page.route("**/api/content/published", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        content: { ...draftContent, status: "published" },
        backend: { mode: "demo-recording", configured: true, missing: [] }
      })
    });
  });

  await page.route("**/api/admin/content/draft", async (route) => {
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON() as { content?: HbicContent };
      draftContent = payload.content ?? draftContent;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        content: { ...draftContent, status: "draft" },
        backend: { mode: "demo-recording", configured: true, missing: [] }
      })
    });
  });

  await page.route("**/api/admin/content/publish", async (route) => {
    draftContent = {
      ...draftContent,
      status: "published",
      version: draftContent.version + 1,
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        content: draftContent,
        backend: { mode: "demo-recording", configured: true, missing: [] },
        revalidated: publicRevalidationPaths
      })
    });
  });
}

async function pauseAndScroll(page: Page) {
  await page.waitForTimeout(1_100);
  await page.evaluate(async () => {
    const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const maxScroll = Math.max(total - window.innerHeight, 0);
    const steps = Math.max(2, Math.min(5, Math.ceil(maxScroll / 700)));
    for (let index = 0; index <= steps; index += 1) {
      window.scrollTo({ top: (maxScroll / steps) * index, behavior: "smooth" });
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
    await new Promise((resolve) => setTimeout(resolve, 700));
  });
}

async function clickPage(page: Page, name: string) {
  await page.getByRole("button", { name }).click();
  await pauseAndScroll(page);
}

async function recordAdminDemo() {
  const browser = await launchBrowser();
  const tempDir = join(outputDir, `.tmp-admin-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: tempDir,
      size: viewport
    }
  });
  const page = await context.newPage();
  await installSafeApiMocks(page);
  page.setDefaultTimeout(20_000);

  await page.goto(adminUrl, { waitUntil: "networkidle" });
  await page.getByLabel("Admin publish key").fill("demo-review-key");
  await page.getByRole("button", { name: "Remember key" }).click();
  await pauseAndScroll(page);

  await clickPage(page, "Prayer & Iqamah");
  await clickPage(page, "Jumu'ah");
  await clickPage(page, "Announcements");
  await page.getByLabel("Title").first().fill("Director review: community update");
  await page.waitForTimeout(1_200);

  await clickPage(page, "Events");
  await clickPage(page, "Programs");
  await clickPage(page, "Donations");
  await clickPage(page, "Media");
  await clickPage(page, "Push Notifications");
  await clickPage(page, "Settings");

  await page.getByRole("button", { name: "Save Draft" }).click();
  await page.waitForTimeout(1_500);
  await page.getByRole("button", { name: "Publish Changes" }).click();
  await page.waitForTimeout(2_000);
  await clickPage(page, "Dashboard");

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const videoPath = await video?.path();
  if (!videoPath || !existsSync(videoPath)) throw new Error("Playwright did not create an admin video.");
  await rename(videoPath, outputPath);
  await copyToDesktop(outputPath);
  console.log(`Recorded admin dashboard demo: ${outputPath}`);
}

async function copyToDesktop(filePath: string) {
  if (process.env.DEMO_COPY_DESKTOP === "0") return;
  try {
    const desktopDir = join(process.env.HOME || "", "Desktop", "HBIC-Demo-Recordings");
    await mkdir(desktopDir, { recursive: true });
    await copyFile(filePath, join(desktopDir, filePath.split("/").pop() || "hbic-admin-demo.webm"));
  } catch {
    console.warn("Desktop copy skipped. The recording is still saved in demo-recordings/output.");
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const server = await startAdminServer();
  try {
    await waitForUrl(adminUrl);
    await recordAdminDemo();
  } finally {
    if (server && !server.killed) server.kill("SIGINT");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
