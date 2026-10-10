import { test, expect } from "@playwright/test";

const pages = ["Dashboard", "Prayer & Iqamah", "Jumu'ah", "Prayer Display", "Announcements", "Events", "Programs", "Quran Academy", "Donations", "Media", "Halal Directory", "Community", "Volunteers", "Push Notifications", "Diagnostics", "Feature Flags", "Settings", "Users/Roles"];

test.beforeEach(async ({ page }) => {
  // Browser-local responses only. Never use production admin credentials or write data.
  await page.route("**/api/**", route => route.fulfill({ json: { ok: true, backend: { mode: "layout-test" } } }));
  await page.goto("http://127.0.0.1:3101");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dashboard");
});

for (const width of [320, 430, 768, 1024, 1440]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`${width}px ${colorScheme}: every section fits and remains reachable`, async ({ page }) => {
      await page.setViewportSize({ width, height: 720 });
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      for (const name of pages) {
        if (width <= 920) await page.getByLabel("Dashboard section").selectOption(name);
        else await page.getByRole("navigation", { name: "Admin sections", exact: true }).getByRole("button", { name, exact: true }).click();
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
        const bounds = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
        expect(bounds.document, `Horizontal overflow in ${name}`).toBeLessThanOrEqual(bounds.viewport + 1);
        if (name === "Quran Academy") {
          await expect(page.getByRole("heading", { name: "Quran Academy records are locked" })).toBeVisible();
          await expect(page.getByRole("button", { name: "Publish Changes", exact: true })).toHaveCount(0);
        }
      }
    });
  }
}

test("quick navigation, accessible fields and retained publishing controls", async ({ page }) => {
  await page.getByRole("button", { name: "Quran Academy Families, attendance & tuition" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quran Academy");
  await page.getByRole("button", { name: "Go to secure admin sign-in" }).click();
  await expect(page.getByLabel("Personal administrator email", { exact: true })).toBeVisible();
  await page.getByRole("navigation", { name: "Admin sections", exact: true }).getByRole("button", { name: "Dashboard", exact: true }).click();
  await expect(page.getByRole("button", { name: "Publish Changes", exact: true })).toBeDisabled();
  await page.getByText("Use existing shared HBIC access", { exact: true }).click();
  await expect(page.getByLabel("Shared administrator email", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Shared administrator password", { exact: true })).toBeVisible();
  await page.getByText("Connection & publication details", { exact: true }).click();
  await expect(page.getByLabel("Public content API", { exact: true })).toBeDisabled();
});

test("glass has a readable fallback and reduced motion disables transitions", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  expect(await page.locator(".primary").first().evaluate(el => getComputedStyle(el).transitionDuration)).toBe("0s");
  expect(await page.locator("body").evaluate(el => getComputedStyle(el).color)).toBe("rgb(231, 242, 246)");
  const nav = page.getByRole("navigation", { name: "Admin sections", exact: true });
  expect(await nav.evaluate(el => getComputedStyle(el).overflowY)).toBe("auto");
});
