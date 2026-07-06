import { chromium, type Browser, type Page } from "@playwright/test";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import { existsSync } from "fs";
import { copyFile, mkdir, rename } from "fs/promises";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

type DemoMode = "desktop" | "mobile" | "all";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const outputDir = join(rootDir, "demo-recordings", "output");
const desktopOutput = join(outputDir, "hbic-public-website-desktop-demo.webm");
const mobileOutput = join(outputDir, "hbic-public-website-mobile-demo.webm");
const baseUrl = process.env.PUBLIC_SITE_URL || "http://127.0.0.1:3100";
const desktopViewport = { width: 1440, height: 1000 };
const mobileViewport = { width: 390, height: 844 };
const routes = [
  { label: "Home", path: "/" },
  { label: "Prayer Times", path: "/prayer-times" },
  { label: "Events", path: "/events" },
  { label: "Donate", path: "/donate" },
  { label: "Programs", path: "/programs" },
  { label: "Youth", path: "/youth" },
  { label: "Media", path: "/media" },
  { label: "Contact", path: "/contact" },
  { label: "About", path: "/about" }
];

function getMode(): DemoMode {
  const modeFlagIndex = process.argv.indexOf("--mode");
  const value = modeFlagIndex >= 0 ? process.argv[modeFlagIndex + 1] : process.env.DEMO_MODE;
  return value === "mobile" || value === "all" ? value : "desktop";
}

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

async function startPublicServer(): Promise<ChildProcessWithoutNullStreams | null> {
  if (process.env.PUBLIC_SITE_URL) return null;
  if (await isReachable(baseUrl)) return null;

  const child = spawn("npm", ["run", "dev:web"], {
    cwd: rootDir,
    env: { ...process.env },
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

async function smoothScroll(page: Page) {
  await page.waitForTimeout(1_000);
  await page.evaluate(async () => {
    const total = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const viewport = window.innerHeight;
    const maxScroll = Math.max(total - viewport, 0);
    const steps = Math.max(3, Math.min(7, Math.ceil(maxScroll / 650)));

    for (let index = 0; index <= steps; index += 1) {
      window.scrollTo({ top: (maxScroll / steps) * index, behavior: "smooth" });
      await new Promise((resolve) => setTimeout(resolve, 1_150));
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
    await new Promise((resolve) => setTimeout(resolve, 900));
  });
}

async function recordPass(label: string, viewport: { width: number; height: number }, outputPath: string) {
  const browser = await launchBrowser();
  const tempDir = join(outputDir, `.tmp-${label}-${Date.now()}`);
  await mkdir(tempDir, { recursive: true });

  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: label === "mobile" ? 3 : 1,
    isMobile: label === "mobile",
    hasTouch: label === "mobile",
    recordVideo: {
      dir: tempDir,
      size: viewport
    }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20_000);

  for (const route of routes) {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1_200);
    await smoothScroll(page);
  }

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  const videoPath = await video?.path();
  if (!videoPath || !existsSync(videoPath)) throw new Error(`Playwright did not create a video for ${label}`);

  await rename(videoPath, outputPath);
  await copyToDesktop(outputPath);
  console.log(`Recorded ${label} public website demo: ${outputPath}`);
}

async function copyToDesktop(filePath: string) {
  if (process.env.DEMO_COPY_DESKTOP === "0") return;
  try {
    const desktopDir = join(process.env.HOME || "", "Desktop", "HBIC-Demo-Recordings");
    await mkdir(desktopDir, { recursive: true });
    await copyFile(filePath, join(desktopDir, filePath.split("/").pop() || "hbic-demo.webm"));
  } catch {
    console.warn("Desktop copy skipped. The recording is still saved in demo-recordings/output.");
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });
  const server = await startPublicServer();
  try {
    await waitForUrl(baseUrl);
    const mode = getMode();
    if (mode === "desktop" || mode === "all") await recordPass("desktop", desktopViewport, desktopOutput);
    if (mode === "mobile" || mode === "all") await recordPass("mobile", mobileViewport, mobileOutput);
  } finally {
    if (server && !server.killed) server.kill("SIGINT");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
