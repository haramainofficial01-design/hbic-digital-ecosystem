import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Fixed vector geometry and real, locally installed typefaces; no image assets.
const directory = path.dirname(fileURLToPath(import.meta.url));
const editions = [
  { name: 'Brothers', side: 'BROTHERS’ SIDE', ink: '#102F43', accent: '#146E75', paper: '#F2F7F7', pale: '#D9E9EC', line: '#A8C8CB', gold: '#9C7D40' },
  { name: 'Sisters', side: 'SISTERS’ SIDE', ink: '#542C47', accent: '#9E486A', paper: '#FFF5F5', pale: '#F0D9E1', line: '#D9ADB9', gold: '#976C49' },
];

function poster(t) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-labelledby="title description">
  <title id="title">Qur’an Class Celebration — ${t.side}</title>
  <desc id="description">HBIC Qur’an Academy, Masjid Bilal, Calgary. Thursday, October 29, 2026, 5:30–7:30 PM. The programme space in the centre is intentionally blank.</desc>
  <style>
    text { fill: ${t.ink}; text-rendering: geometricPrecision; }
    .sans { font-family: 'Avenir Next', Arial, sans-serif; }
    .serif { font-family: Georgia, 'Times New Roman', serif; }
  </style>
  <rect width="1080" height="1350" fill="${t.paper}"/>
  <rect x="26" y="26" width="1028" height="1298" rx="2" fill="none" stroke="${t.line}" stroke-width="1"/>
  <path d="M26 115H0 M1054 115h26 M26 1235H0 M1054 1235h26" stroke="${t.line}"/>
  <text class="sans" x="80" y="88" font-size="25" font-weight="700" letter-spacing="2.5">HBIC QUR’AN ACADEMY</text>
  <text class="sans" x="80" y="121" font-size="20" letter-spacing=".5">Masjid Bilal · Calgary</text>
  <text class="sans" x="1000" y="92" text-anchor="end" font-size="22" font-weight="600" letter-spacing="2" style="fill:${t.accent}">${t.side}</text>
  <path d="M80 155H1000" stroke="${t.line}"/>

  <text class="serif" x="540" y="273" text-anchor="middle" font-size="91" letter-spacing="-3">Qur’an Class</text>
  <text class="serif" x="540" y="375" text-anchor="middle" font-size="103" font-style="italic" letter-spacing="-3" style="fill:${t.accent}">Celebration</text>
  <text class="sans" x="540" y="424" text-anchor="middle" font-size="23" letter-spacing="1">A special end-of-month class</text>

  <path d="M80 474H1000" stroke="${t.line}"/>
  <text class="sans" x="80" y="524" font-size="25" font-weight="600" letter-spacing="1.4">THURSDAY, OCTOBER 29</text>
  <text class="sans" x="80" y="559" font-size="21" letter-spacing="2" style="fill:${t.accent}">2026</text>
  <path d="M572 501V562" stroke="${t.line}"/>
  <text class="sans" x="1000" y="543" text-anchor="end" font-size="43" font-weight="600" letter-spacing="-1">5:30–7:30 PM</text>
  <path d="M80 589H1000" stroke="${t.line}"/>

  <text class="serif" x="540" y="654" text-anchor="middle" font-size="31">Programme</text>
  <path d="M80 644H385 M695 644H1000" stroke="${t.line}"/>
  <!-- Blank programme field: do not add placeholders or activity details. -->
  <rect id="programme-space" x="80" y="686" width="920" height="414" rx="0" fill="#FFFFFF" fill-opacity=".72"/>
  <path d="M80 706v-20h20 M980 686h20v20 M80 1080v20h20 M980 1100h20v-20" fill="none" stroke="${t.line}" stroke-width="1.5"/>

  <rect x="0" y="1160" width="1080" height="190" fill="${t.ink}"/>
  <rect x="26" y="1160" width="1028" height="164" fill="none" stroke="${t.line}" stroke-opacity=".4"/>
  <path d="M480 1197H600" stroke="${t.gold}" stroke-width="2"/>
  <text class="serif" x="540" y="1241" text-anchor="middle" font-size="28" style="fill:${t.paper}">Celebrating a month of learning,</text>
  <text class="serif" x="540" y="1280" text-anchor="middle" font-size="28" style="fill:${t.paper}">recitation &amp; growing together.</text>
</svg>`;
}

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  await page.route('**/*', route => route.abort());
  for (const edition of editions) {
    const svg = poster(edition);
    const basename = path.join(directory, `${edition.name} Programme`);
    await writeFile(`${basename}.svg`, svg);
    await page.setContent(`<html><head><meta charset="utf-8"/><style>html,body{margin:0;width:1080px;height:1350px;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    const issues = await page.locator('svg').evaluate(svg => [...svg.querySelectorAll('text')].flatMap(text => {
      const b = text.getBBox();
      return b.x < 25 || b.x + b.width > 1055 || b.y < 25 || b.y + b.height > 1325 ? [text.textContent] : [];
    }));
    if (issues.length) throw new Error(`Text outside safe area: ${issues.join(', ')}`);
    await page.screenshot({ path: `${basename}.png` });
    console.log(`${edition.name}: 2160 × 2700 PNG and editable SVG; text inside safe area.`);
  }
} finally {
  await browser.close();
}
