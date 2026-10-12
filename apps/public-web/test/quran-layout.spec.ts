import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createWidgetPrayerSnapshot, defaultContent } from "@hbic/shared";

// Reuse the licensed, unmodified Tanzil source already in the repository.
// Fixtures are intercepted browser-locally; they never become production content.
const source = JSON.parse(readFileSync(resolve(__dirname, "../../mobile/assets/quran/tanzil-uthmani.json"), "utf8"));
const chapters = source.chapters.map((item: any) => item.chapter);
const verse = (key: string) => {
  const [chapter, ayah] = key.split(":").map(Number);
  return { ...source.chapters[chapter - 1].verses[ayah - 1], audioUrl: "https://verses.quran.com/layout-fixture.wav" };
};
const resources = { reciters: [{ id: 7, name: "Mishary Rashid Alafasy" }], translations: [{ id: 20, name: "Saheeh International", author: "Saheeh International", language: "English" }] };
const modes = ["Read", "Listen", "Practise", "Memorization", "Test yourself", "Library"];

async function fixtures(page: Page) {
  await page.route("**/api/quran?**", async route => {
    const u = new URL(route.request().url()), mode = u.searchParams.get("mode");
    let json: any = { ok: true };
    if (mode === "chapters") json = { ...json, chapters, availability: { production: true } };
    else if (mode === "resources") json = { ...json, resources };
    else if (mode === "chapter") {
      const chapter = Number(u.searchParams.get("chapter")), pageNumber = Number(u.searchParams.get("page"));
      const item = source.chapters[chapter - 1];
      json = { ...json, chapter: item.chapter, page: pageNumber, verses: item.verses.slice((pageNumber - 1) * 50, pageNumber * 50).map((v: any) => verse(v.verseKey)), hasMore: pageNumber * 50 < item.chapter.versesCount };
    } else if (mode === "verse") json = { ...json, verse: verse(u.searchParams.get("key")!) };
    else if (mode === "search") json = { ...json, verses: [verse("2:255")] };
    else if (mode === "mushaf-reference") json = { ...json, page: 1 };
    else { await route.fulfill({ status: 503, json: { ok: false, message: "Layout test: verified page temporarily unavailable." } }); return; }
    await route.fulfill({ json });
  });
  await page.route("https://www.mp3quran.net/api/**", route => route.fulfill({ json: { reciters: [{ id: 123, name: "Mishary Rashid Alafasy", moshaf: [{ id: 1, name: "Hafs", server: "https://server8.mp3quran.net/afs/", surah_list: "1,2,112,113,114", rewaya_id: 1 }] }] } }));
  await page.route("**/api/display?**", route => route.fulfill({ json: { ok: true, contentVersion: 1, snapshot: createWidgetPrayerSnapshot(defaultContent, new Date()), display: {} } }));
  // Do not download models, microphone data, or remote recordings in UI tests.
  await page.route("https://verses.quran.com/**", route => route.abort());
}

async function fits(page: Page) {
  const bounds = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth,
    outside: Array.from(document.querySelectorAll("body *")).filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.right > window.innerWidth + 1 || r.left < -1); }).slice(0, 12).map(el => ({ tag: el.tagName, class: el.className, right: el.getBoundingClientRect().right })) }));
  expect(bounds.overflow, JSON.stringify(bounds.outside)).toBeLessThanOrEqual(1);
  const clippedControls = await page.locator("main input:visible, main select:visible, main button:visible").evaluateAll(elements => elements.filter(el => {
    const rect = el.getBoundingClientRect();
    return rect.left < -1 || rect.right > window.innerWidth + 1;
  }).map(el => el.getAttribute("aria-label") || el.textContent));
  expect(clippedControls).toEqual([]);
}

test.beforeEach(async ({ page }) => { await fixtures(page); });

for (const width of [320, 390, 700, 768, 1024, 1440, 1920]) for (const colorScheme of ["light", "dark"] as const) {
  test(`${width}px ${colorScheme}: all Quran tools fit`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto("/quran");
    await expect(page.locator("#ayah-1-1")).toBeVisible();
    const tools = page.getByRole("navigation", { name: "Quran tools" });
    await page.getByText("Reader settings", { exact: true }).click();
    await page.getByRole("button", { name: "Increase Arabic size" }).click();
    for (const mode of modes) {
      await tools.getByRole("button", { name: mode, exact: true }).click();
      if (mode === "Test yourself") {
        await page.getByRole("button", { name: "Start self-test", exact: true }).click();
        await page.getByRole("button", { name: "Word hint", exact: true }).click();
        await page.getByRole("button", { name: "Reveal ayah", exact: true }).click();
      }
      if (mode === "Listen") {
        await page.getByRole("button", { name: /Mishary Rashid Alafasy/ }).click();
        await expect(page.getByLabel("Recording edition")).toBeVisible();
      }
      await fits(page);
    }
    await tools.getByRole("button", { name: "Read", exact: true }).click();
    if (width === 390 || width === 1440) {
      await page.getByText("Reader settings", { exact: true }).click();
      await page.locator("#reader").scrollIntoViewIfNeeded();
      await page.screenshot({ path: `output/quran-web-layout/reader-${width}-${colorScheme}.png` });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `output/quran-web-layout/quran-${width}-${colorScheme}.png`, fullPage: true });
    }
    expect(errors).toEqual([]);
  });
}

test("surah selection, search, bookmarks and Mushaf failure recovery remain usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/quran");
  await page.getByLabel("Choose a surah", { exact: true }).selectOption("112");
  await expect(page.locator("#ayah-112-1")).toBeVisible();
  await page.getByRole("button", { name: "Bookmark ayah 112:1", exact: true }).click();
  await page.getByRole("navigation", { name: "Quran tools" }).getByRole("button", { name: "Library (1)", exact: true }).click();
  await page.getByRole("button", { name: "Ayah 112:1", exact: true }).click();
  await expect(page.locator("#ayah-112-1")).toBeVisible();
  await page.locator("summary").filter({ hasText: "Find an ayah" }).click();
  await page.getByLabel("Search the Quran", { exact: true }).fill("2:255");
  await page.getByRole("search", { name: "Quran search" }).getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Verified results", exact: true })).toBeVisible();
  await fits(page);
  await page.getByRole("button", { name: "Return to surah", exact: true }).click();
  await page.getByRole("button", { name: "Madinah · 15 lines", exact: true }).click();
  await expect(page.locator("#reader").getByRole("alert")).toContainText("verified page temporarily unavailable");
  await fits(page);
  await page.getByRole("button", { name: "Ayah View", exact: true }).click();
  await expect(page.locator("#ayah-112-1")).toBeVisible();
});

test("desktop surah filtering does not alter provider Quran text", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/quran");
  await page.getByLabel("Find a surah", { exact: true }).fill("الإخلاص");
  await page.getByRole("complementary", { name: "Surah navigation" }).getByRole("button", { name: /112/ }).click();
  await expect(page.locator("#ayah-112-1 p[lang=ar]")).toHaveText(source.chapters[111].verses[0].textUthmani);
});

for (const width of [320, 390, 768, 1440]) test(`${width}px: reading focus preserves text, exits safely and restores keyboard search`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/quran");
  const text = source.chapters[0].verses[0].textUthmani;
  await expect(page.locator("#ayah-1-1 p[lang=ar]")).toHaveText(text);
  await page.getByRole("button", { name: "Focus reading", exact: true }).click();
  await expect(page.getByLabel("Search the Quran", { exact: true })).toBeHidden();
  await expect(page.getByRole("button", { name: "Leave focus", exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Quran tools" })).toBeHidden();
  await expect(page.locator("#ayah-1-1 p[lang=ar]")).toHaveText(text);
  await fits(page);
  if (width === 390 || width === 1440) await page.screenshot({ path: `output/quran-web-layout/focus-${width}.png` });
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Focus reading", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Focus reading", exact: true }).click();
  await page.keyboard.press("Control+k");
  await expect(page.getByLabel("Search the Quran", { exact: true })).toBeFocused();
  await fits(page);
});

test("primary tools stay compact while every practice and bookmark destination remains accessible", async ({ page }) => {
  await page.goto("/quran");
  const tools = page.getByRole("navigation", { name: "Quran tools" });
  await expect(tools.getByRole("button")).toHaveCount(4);
  await tools.getByRole("button", { name: "Practise", exact: true }).click();
  await expect(tools.getByRole("button", { name: "Recite", exact: true })).toBeVisible();
  await tools.getByRole("button", { name: "Test yourself", exact: true }).click();
  await expect(tools.getByRole("button", { name: "Practise", exact: true })).toHaveAttribute("aria-pressed", "true");
  await tools.getByRole("button", { name: "Library", exact: true }).click();
  await expect(tools.getByRole("button", { name: "Bookmarks", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your bookmarks", exact: true })).toBeVisible();
});

test("mobile prayer panel closes on page scrolling but not its internal scroll", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/quran");
  const toggle = page.locator(".prayer-mobile-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.locator("#prayer-mobile-panel").evaluate(el => { el.scrollTop = 100; el.dispatchEvent(new Event("scroll")); });
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.evaluate(() => window.scrollBy(0, 200));
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.evaluate(() => window.scrollTo(0, 0));
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await fits(page);
});

test("scroll-to-minimize also works outside the Quran page", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/programs");
  const toggle = page.locator(".prayer-mobile-toggle");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.evaluate(() => window.scrollBy(0, 160));
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("Qibla still locates without a browser compass API", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "DeviceOrientationEvent", { value: undefined });
    Object.defineProperty(navigator, "geolocation", { value: { getCurrentPosition(success: any) { success({ coords: { latitude: 51.0447, longitude: -114.0719, accuracy: 30 } }); } } });
  });
  await page.goto("/quran");
  await page.getByRole("button", { name: "Use my location", exact: true }).click();
  await expect(page.locator("#qibla")).toContainText("No live compass");
});

test("audio failure remains readable and the player can be dismissed", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/quran");
  await page.getByRole("button", { name: "Play ayah 1:1", exact: true }).click();
  await expect(page.getByRole("region", { name: "Quran audio player" })).toBeVisible();
  await fits(page);
  await page.getByRole("button", { name: "Stop recitation", exact: true }).click();
  await expect(page.getByRole("region", { name: "Quran audio player" })).toHaveCount(0);
});

test("unavailable content has visible recovery without fabricated Quran", async ({ page }) => {
  await page.route("**/api/quran?**", route => route.fulfill({ status: 503, json: { ok: false, message: "Layout test: connection unavailable." } }));
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/quran");
  await expect(page.locator("#reader").getByRole("alert")).toContainText("connection unavailable");
  await expect(page.getByRole("button", { name: "Retry connection", exact: true })).toBeVisible();
  await expect(page.locator("article[data-ayah]")).toHaveCount(0);
  await fits(page);
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: verified live Madinah data renders without clipping`, async ({ page }) => {
    test.skip(process.env.HBIC_QURAN_VERIFY_MUSHAF !== "1", "Optional read-only live-provider check.");
    test.setTimeout(60_000);
    const response = await fetch("https://hbic.ca/api/quran?mode=mushaf&page=1", { signal: AbortSignal.timeout(15_000) });
    const body = await response.json();
    expect(response.ok && body.ok).toBeTruthy();
    await page.route("**/api/quran?**", async route => {
      if (new URL(route.request().url()).searchParams.get("mode") === "mushaf") await route.fulfill({ json: body });
      else await route.fallback();
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/quran");
    await page.getByRole("button", { name: "Madinah · 15 lines", exact: true }).click();
    const frame = page.frameLocator('iframe[title="Madinah Mushaf page 1"]');
    await expect(frame.locator("#page.ready")).toBeVisible({ timeout: 25_000 });
    await expect(frame.locator("[data-line]")).toHaveCount(15);
    expect(await frame.locator("body").evaluate(el => el.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(1);
    await frame.locator(".word").first().click();
    await expect(page.getByRole("button", { name: "Open meaning", exact: true })).toBeVisible();
    await fits(page);
    await page.locator("#reader").screenshot({ path: `output/quran-web-layout/mushaf-${width}.png` });
  });
}
