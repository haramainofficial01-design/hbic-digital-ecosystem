import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { chromium } from "@playwright/test";

// Explicit opt-in; public GETs only. Weather is changed inside this browser,
// never in HBIC's published settings. CPU throttling is not a real Fire Stick.
const base = process.env.HBIC_TV_VERIFY_URL;
const requestedSeconds = Number(process.env.HBIC_TV_SOAK_SECONDS);
const seconds = Math.max(30, Math.min(900, requestedSeconds || 180));

test("TV survives repeated weather replacement with bounded DOM, memory and clock drift", {
  skip: !base || !requestedSeconds,
  timeout: (seconds + 60) * 1000
}, async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
    await cdp.send("Performance.enable");
    let layers: Array<{ drawsContent?: boolean; width: number; height: number }> = [];
    await cdp.send("LayerTree.enable");
    cdp.on("LayerTree.layerTreeDidChange", event => { layers = event.layers ?? []; });
    let weatherCode = 61;
    await page.route("**/api/display/weather", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, temperature: 4, condition: ({ 0: "Clear", 3: "Cloudy", 45: "Fog", 61: "Rain", 73: "Snow", 95: "Thunderstorm" } as Record<number, string>)[weatherCode], weatherCode, cloudCover: weatherCode ? 85 : 8, windSpeed: 28, windDirection: 220 }) }));
    await page.goto(new URL("/display", base!).href, { waitUntil: "networkidle" });
    await page.waitForFunction(() => document.querySelector('canvas[data-weather-surface]')?.getAttribute("width") === "960");
    const samples: unknown[] = [];
    const counters = async () => {
      await cdp.send("HeapProfiler.collectGarbage");
      const heap = await cdp.send("Runtime.getHeapUsage");
      const dom = await cdp.send("Memory.getDOMCounters");
      const metrics = (await cdp.send("Performance.getMetrics")).metrics;
      const ui = await page.evaluate(() => ({
        nodes: document.querySelectorAll("*").length,
        weather: document.querySelector("main")?.getAttribute("data-weather"),
        clock: document.querySelector("header strong")?.textContent,
        expectedClock: new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date()),
        surfaces: [...document.querySelectorAll("canvas")].map(canvas => ({ width: canvas.width, height: canvas.height }))
      }));
      // A sample can straddle a wall-second boundary; compare again after its tick.
      if (ui.clock !== ui.expectedClock) {
        await page.waitForTimeout(1100);
        assert.equal(await page.locator("header strong").first().textContent(), await page.evaluate(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Edmonton", hour: "numeric", minute: "2-digit", second: "2-digit" }).format(new Date())));
      }
      assert.ok(ui.surfaces.length === 2 && ui.surfaces.every(surface => surface.width <= 960 && surface.height <= 540));
      return { at: new Date().toISOString(), heapBytes: heap.usedSize, dom, ui, layers: layers.length, layerPixels: layers.filter(layer => layer.drawsContent).reduce((total, layer) => total + layer.width * layer.height, 0), taskSeconds: metrics.find(metric => metric.name === "TaskDuration")?.value };
    };
    const first = await counters(); samples.push(first);
    const modes = [73, 3, 45, 95, 0, 61];
    const started = Date.now();
    let index = 0;
    while (Date.now() - started < seconds * 1000) {
      await page.waitForTimeout(Math.min(30_000, seconds * 1000 - (Date.now() - started)));
      weatherCode = modes[index++ % modes.length];
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await page.waitForTimeout(300);
      samples.push(await counters());
    }
    const last = await counters(); samples.push(last);
    assert.ok(last.heapBytes - first.heapBytes < 4 * 1024 * 1024, "post-GC heap must remain bounded across weather replacements");
    assert.ok(last.dom.jsEventListeners <= first.dom.jsEventListeners + 2, "weather replacement must release listeners");
    assert.ok(last.dom.nodes <= first.dom.nodes + 30, "detached weather trees must not accumulate");
    assert.deepEqual(errors, []);
    const directory = path.resolve(import.meta.dirname, "../../../output/tv-display-fire-tv");
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, "soak.json"), JSON.stringify({ seconds, cpuThrottle: 6, samples, browserErrors: errors }, null, 2));
    console.log(JSON.stringify({ seconds, replacements: index, heapGrowthBytes: last.heapBytes - first.heapBytes, listenerGrowth: last.dom.jsEventListeners - first.dom.jsEventListeners, domGrowth: last.dom.nodes - first.dom.nodes, browserErrors: errors.length }));
  } finally { await browser.close(); }
});
