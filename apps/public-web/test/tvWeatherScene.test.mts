import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { deriveWeatherVisualState } from "../lib/tvDisplay";

test("weather rendering pauses, respects reduced motion and releases all scheduled work", async () => {
  const bundled = await build({
    bundle: true, write: false, format: "iife", platform: "browser",
    stdin: { resolveDir: process.cwd(), loader: "ts", contents: `
      import { startTvWeatherScene } from './apps/public-web/lib/tvWeatherCanvas';
      window.startWeather = weather => startTvWeatherScene(document.querySelector('#weather'), document.querySelector('main'), weather, document.querySelector('#clouds'));
    ` }
  });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 3840, height: 2160 }, deviceScaleFactor: 2 });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.setContent('<main style="position:relative;width:100vw;height:100vh"><h2 data-weather-text>Maghrib</h2><strong data-weather-text>6:18 p.m.</strong><canvas id="weather"></canvas><canvas id="clouds"></canvas></main>');
    await page.addScriptTag({ content: "window.__name = fn => fn;" });
    await page.evaluate(() => {
      const state = (window as any).weatherWork = { paints: 0, timeouts: new Set(), frames: new Set(), hidden: false };
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state.hidden ? "hidden" : "visible" });
      const paint = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) { state.paints++; return paint.apply(this, args); };
      const schedule = window.setTimeout.bind(window), cancel = window.clearTimeout.bind(window);
      window.setTimeout = ((callback: () => void, delay: number) => {
        const id = schedule(() => { state.timeouts.delete(id); callback(); }, delay);
        state.timeouts.add(id); return id;
      }) as typeof window.setTimeout;
      window.clearTimeout = id => { state.timeouts.delete(id); cancel(id); };
      const request = window.requestAnimationFrame.bind(window), cancelFrame = window.cancelAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => {
        const id = request(time => { state.frames.delete(id); callback(time); });
        state.frames.add(id); return id;
      };
      window.cancelAnimationFrame = id => { state.frames.delete(id); cancelFrame(id); };
    });
    await page.addScriptTag({ content: bundled.outputFiles[0].text });
    const weather = deriveWeatherVisualState({ temperature: -8, condition: "Snow", snowfall: 2, windSpeed: 27 });
    await page.evaluate(weather => { (window as any).stopWeather = (window as any).startWeather(weather); }, weather);
    await page.waitForTimeout(350);
    assert.deepEqual(await page.locator("#weather").evaluate((element: HTMLCanvasElement) => [element.width, element.height]), [960, 540]);
    const work = () => page.evaluate(() => { const s = (window as any).weatherWork; return { paints: s.paints, timeouts: s.timeouts.size, frames: s.frames.size }; });
    const running = await work();
    assert.ok(running.paints >= 3 && running.paints <= 10);
    assert.ok(running.timeouts <= 1 && running.frames <= 1);

    await page.evaluate(() => { (window as any).weatherWork.hidden = true; document.dispatchEvent(new Event("visibilitychange")); });
    const hidden = await work(); await page.waitForTimeout(250);
    assert.deepEqual(await work(), { paints: hidden.paints, timeouts: 0, frames: 0 });
    assert.equal(await page.locator("main").getAttribute("data-motion"), "paused");
    await page.evaluate(() => { (window as any).weatherWork.hidden = false; document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForTimeout(150);
    assert.ok((await work()).paints > hidden.paints);

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    const reduced = await work(); await page.waitForTimeout(250);
    assert.deepEqual(await work(), { paints: reduced.paints, timeouts: 0, frames: 0 });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForTimeout(150);
    assert.ok((await work()).paints > reduced.paints);

    await page.evaluate(() => (window as any).stopWeather());
    const disposed = await work();
    assert.deepEqual(await page.locator("#weather").evaluate((element: HTMLCanvasElement) => [element.width, element.height]), [0, 0]);
    assert.deepEqual(await page.locator("#clouds").evaluate((element: HTMLCanvasElement) => [element.width, element.height]), [0, 0]);
    await page.evaluate(weather => {
      for (let index = 0; index < 30; index++) (window as any).startWeather(weather)();
    }, weather);
    const remounted = await work();
    assert.ok(remounted.paints > disposed.paints);
    await page.evaluate(() => { window.dispatchEvent(new Event("resize")); document.dispatchEvent(new Event("visibilitychange")); });
    await page.waitForTimeout(250);
    assert.deepEqual(await work(), { paints: remounted.paints, timeouts: 0, frames: 0 });
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});
