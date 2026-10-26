import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Fixed vector geometry and real, locally installed typefaces; no image assets.
const directory = path.dirname(fileURLToPath(import.meta.url));
const editions = [
  { name: 'Brothers', side: 'BROTHERS’ SIDE', ink: '#102F43', accent: '#146E75', paper: '#F2F7F7', pale: '#D9E9EC', line: '#A8C8CB', gold: '#BC9C60' },
  { name: 'Sisters', side: 'SISTERS’ SIDE', ink: '#542C47', accent: '#9E486A', paper: '#FFF5F5', pale: '#F0D9E1', line: '#D9ADB9', gold: '#C19479' },
];

function star(cx, cy, outer, inner, points = 8) {
  return Array.from({ length: points * 2 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / points;
    const radius = i % 2 ? inner : outer;
    return `${(cx + Math.cos(angle) * radius).toFixed(2)},${(cy + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(' ');
}

function poster(t) {
  const arch = 'M76 1190V415Q76 255 340 201Q469 174 540 132Q611 174 740 201Q1004 255 1004 415V1190Q1004 1246 948 1246H132Q76 1246 76 1190Z';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-labelledby="title description">
  <title id="title">Qur’an Class Celebration — ${t.side}</title>
  <desc id="description">HBIC Qur’an Academy, Masjid Bilal, Calgary. Thursday, October 29, 2026, 5:30–7:30 PM. The programme space in the centre is intentionally blank.</desc>
  <defs>
    <pattern id="geometry" width="128" height="128" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="${t.gold}" stroke-width="1.1">
        <polygon points="${star(64, 64, 57, 40.3)}"/>
        <rect x="35.5" y="35.5" width="57" height="57"/>
        <rect x="35.5" y="35.5" width="57" height="57" transform="rotate(45 64 64)"/>
        <path d="M0 0L24 24M104 104L128 128M128 0L104 24M24 104L0 128M64 7V0M64 121V128M7 64H0M121 64H128"/>
      </g>
    </pattern>
    <clipPath id="arch-clip"><path d="${arch}"/></clipPath>
  </defs>
  <style>
    text { fill: ${t.ink}; text-rendering: geometricPrecision; }
    .sans { font-family: 'Avenir Next', Arial, sans-serif; }
    .serif { font-family: Georgia, 'Times New Roman', serif; }
  </style>
  <rect width="1080" height="1350" fill="${t.ink}"/>
  <rect width="1080" height="1350" fill="url(#geometry)" opacity=".21"/>
  <rect x="25" y="25" width="1030" height="1300" fill="none" stroke="${t.gold}" stroke-width="1"/>
  <rect x="35" y="35" width="1010" height="1280" fill="none" stroke="${t.gold}" stroke-width=".5" opacity=".55"/>
  <rect x="169" y="44" width="742" height="83" fill="${t.ink}"/>
  <text class="sans" x="540" y="75" text-anchor="middle" font-size="25" font-weight="600" letter-spacing="3.1" style="fill:${t.paper}">HBIC QUR’AN ACADEMY</text>
  <text class="sans" x="540" y="108" text-anchor="middle" font-size="18" letter-spacing="1" style="fill:${t.paper}">Masjid Bilal · Calgary</text>

  <path d="${arch}" fill="${t.paper}"/>
  <g clip-path="url(#arch-clip)" opacity=".3" fill="none" stroke="${t.line}">
    <circle cx="54" cy="426" r="135"/><circle cx="54" cy="426" r="151"/>
    <circle cx="1026" cy="426" r="135"/><circle cx="1026" cy="426" r="151"/>
  </g>
  <path d="${arch}" fill="none" stroke="${t.gold}" stroke-width="1.5"/>
  <path d="M94 1188V416Q94 269 347 218Q475 191 540 153Q605 191 733 218Q986 269 986 416V1188Q986 1228 946 1228H134Q94 1228 94 1188Z" fill="none" stroke="${t.line}" stroke-width=".9"/>

  <polygon points="${star(540, 215, 18, 12.7)}" fill="none" stroke="${t.gold}" stroke-width="1.4"/>
  <polygon points="${star(540, 215, 8.5, 6)}" fill="${t.gold}"/>
  <text class="sans" x="540" y="275" text-anchor="middle" font-size="21" font-weight="600" letter-spacing="4" style="fill:${t.accent}">${t.side}</text>
  <path d="M366 267H410M670 267H714" stroke="${t.gold}"/>
  <text class="serif" x="540" y="365" text-anchor="middle" font-size="75" letter-spacing="-2.2">Qur’an Class</text>
  <text class="serif" x="540" y="460" text-anchor="middle" font-size="99" font-style="italic" letter-spacing="-3" style="fill:${t.accent}">Celebration</text>
  <text class="sans" x="540" y="506" text-anchor="middle" font-size="21" letter-spacing=".6">A special end-of-month class</text>

  <path d="M130 548H950M130 671H950" stroke="${t.line}"/>
  <text class="serif" x="138" y="639" font-size="83" letter-spacing="-4">29</text>
  <path d="M270 574V644M618 574V644" stroke="${t.line}"/>
  <text class="sans" x="299" y="600" font-size="23" font-weight="600" letter-spacing="1.6">THURSDAY</text>
  <text class="sans" x="299" y="635" font-size="21" letter-spacing="1">OCTOBER 2026</text>
  <text class="sans" x="945" y="614" text-anchor="end" font-size="35" font-weight="600" letter-spacing="-.7">5:30–7:30 PM</text>

  <path d="M130 726H382M698 726H950" stroke="${t.line}"/>
  <polygon points="${star(377, 726, 5, 3.5, 4)}" fill="${t.gold}"/>
  <polygon points="${star(703, 726, 5, 3.5, 4)}" fill="${t.gold}"/>
  <text class="serif" x="540" y="737" text-anchor="middle" font-size="33">Programme</text>
  <!-- Blank programme field: do not add placeholders or activity details. -->
  <rect id="programme-space" x="130" y="771" width="820" height="347" fill="#FFFFFF" fill-opacity=".35"/>
  <path d="M130 807V771H166M914 771H950V807M130 1082V1118H166M914 1118H950V1082" fill="none" stroke="${t.gold}" stroke-width="1.2"/>
  <path d="M141 794V782H153M927 782H939V794M141 1095V1107H153M927 1107H939V1095" fill="none" stroke="${t.line}" stroke-width="1"/>

  <path d="M130 1153H447M633 1153H950" stroke="${t.line}"/>
  <polygon points="${star(540, 1153, 12, 8.5)}" fill="none" stroke="${t.gold}"/>
  <path d="M474 1153H510M570 1153H606" stroke="${t.gold}"/>
  <text class="serif" x="540" y="1192" text-anchor="middle" font-size="20">Celebrating a month of learning, recitation &amp; growing together.</text>
  <rect x="322" y="1265" width="436" height="41" fill="${t.ink}"/>
  <text class="sans" x="540" y="1292" text-anchor="middle" font-size="18" letter-spacing="2.8" style="fill:${t.paper}">MASJID BILAL · CALGARY</text>
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
