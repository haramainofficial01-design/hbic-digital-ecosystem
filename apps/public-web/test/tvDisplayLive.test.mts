import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";

// Explicit opt-in. Only public GETs are sent; network failures below are
// simulated in this browser and never change published prayer data.
const base = process.env.HBIC_TV_VERIFY_URL;

test("deployed TV display advances seconds, fits TV sizes and recovers its public schedule", {
  skip: !base,
  timeout: 120_000
}, async () => {
  const origin = new URL(base!);
  const response = await fetch(new URL("/display", origin));
  assert.equal(response.status, 200);
  const html = await response.text();
  const scripts = [...new Set([...html.matchAll(/src="([^"\s]+\.js(?:\?[^"\s]*)?)"/g)].map(match => match[1]))];
  const bundles = await Promise.all(scripts.map(async src => (await fetch(new URL(src, origin))).text()));
  assert.ok(bundles.some(bundle => bundle.includes("Daily schedule has not refreshed yet")), "served bundle contains the optimized display implementation");

  const browser = await chromium.launch({ headless: true });
  try {
    for (const [width, height, weather] of [[1280, 720, "clear"], [1920, 1080, "rain"], [3840, 2160, "snow"]] as const) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      try {
        const url = new URL("/display", origin);
        url.searchParams.set("previewWeather", weather);
        await page.goto(url.href, { waitUntil: "networkidle" });
        await page.waitForFunction(expected => document.querySelector("main")?.getAttribute("data-weather") === expected, weather);
        const schedule = page.getByRole("region", { name: "Today's prayer and iqamah times", exact: true });
        assert.equal(await schedule.locator(":scope > div").count(), 6);
        const clock = page.locator("header strong").first();
        const firstTime = await clock.textContent();
        assert.match(firstTime ?? "", /\d{1,2}:\d{2}:\d{2}/);
        await page.waitForFunction(previous => document.querySelector("header strong")?.textContent !== previous, firstTime, { timeout: 3500 });
        const layout = await page.evaluate(() => ({
          width: innerWidth,
          height: innerHeight,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
          nodes: document.querySelectorAll("*").length,
          tiles: [...document.querySelectorAll("section[aria-label=\"Today's prayer and iqamah times\"] > div")].map(node => {
            const r = node.getBoundingClientRect();
            return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
          })
        }));
        assert.ok(layout.scrollWidth <= width + 1 && layout.scrollHeight <= height + 1, `TV overflow at ${width}×${height}`);
        assert.ok(layout.tiles.every(r => r.width > 0 && r.height > 0 && r.x >= -1 && r.y >= -1 && r.right <= width + 1 && r.bottom <= height + 1));

        if (process.env.HBIC_TV_VERIFY_SCREENSHOTS === "1") {
          const directory = path.resolve(import.meta.dirname, "../../../output/tv-display-live");
          await mkdir(directory, { recursive: true });
          await page.screenshot({ path: path.join(directory, `${width}-${weather}.png`) });
        }

        if (weather === "rain") {
          const before = await schedule.innerText();
          const displayRequest = /\/api\/display(?:\?.*)?$/;
          await page.route(displayRequest, route => route.fulfill({ status: 503, contentType: "application/json", body: '{"ok":false}' }));
          await page.evaluate(() => window.dispatchEvent(new Event("focus")));
          await page.getByText("Using last confirmed schedule · reconnecting", { exact: true }).waitFor();
          assert.equal(await schedule.innerText(), before, "public API failure retains the confirmed prayer schedule");
          const offlineTime = await clock.textContent();
          await page.waitForFunction(previous => document.querySelector("header strong")?.textContent !== previous, offlineTime, { timeout: 3500 });
          await page.unroute(displayRequest);
          await page.evaluate(() => window.dispatchEvent(new Event("focus")));
          await page.getByText("Using last confirmed schedule · reconnecting", { exact: true }).waitFor({ state: "detached" });
        }
        assert.deepEqual(errors, [], `browser exceptions at ${width}×${height}`);
        console.log(JSON.stringify({ viewport: `${width}×${height}`, weather, nodes: layout.nodes, prayerCards: layout.tiles.length, clockAdvanced: true, overflow: false, browserErrors: errors.length }));
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
});
