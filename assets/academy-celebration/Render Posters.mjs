import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Fixed vector geometry and real, locally installed typefaces; no image assets.
const directory = path.dirname(fileURLToPath(import.meta.url));
const logo = (await readFile(path.join(directory, '../../apps/public-web/public/brand/hbic-logo.png'))).toString('base64');
const editions = [
  { name: 'Brothers', side: 'BROTHERS’ SIDE', ink: '#102F43', accent: '#146E75', paper: '#F2F7F7', pale: '#D9E9EC', line: '#A8C8CB', gold: '#BC9C60' },
  { name: 'Sisters', side: 'SISTERS’ SIDE', ink: '#542C47', accent: '#9E486A', paper: '#FFF5F5', pale: '#F0D9E1', line: '#D9ADB9', gold: '#C19479' },
];

function rosette(t) {
  const sister = t.name === 'Sisters';
  const cx = 850, cy = 329, radius = 148, folds = sister ? 32 : 24;
  let shapes = '';
  for (let i = 0; i < folds; i++) {
    const a = -Math.PI / 2 + i * Math.PI * 2 / folds;
    const b = a + Math.PI / folds;
    const c = a + Math.PI * 2 / folds;
    const point = (angle, r) => `${(cx + Math.cos(angle) * r).toFixed(2)},${(cy + Math.sin(angle) * r).toFixed(2)}`;
    const inner = point(a, 70), outer = point(a, radius);
    const mid = point(b, sister ? radius - 8 : radius - 24);
    shapes += `<polygon points="${cx},${cy} ${outer} ${mid}" fill="url(#fold-light)"/>`;
    shapes += `<polygon points="${cx},${cy} ${mid} ${point(c, radius)}" fill="url(#fold-dark)"/>`;
    shapes += `<path d="M${inner}L${outer}" stroke="${t.gold}" stroke-opacity=".35" stroke-width=".6"/>`;
  }
  return `<g filter="url(#paper-shadow)">
+    <path d="M784 417L748 549L813 523L847 568L877 425Z" fill="url(#ribbon)"/>
+    <path d="M841 421L876 565L914 519L968 538L921 410Z" fill="${t.accent}"/>
+    <path d="M802 433L783 515M905 433L929 510" stroke="${t.gold}" stroke-opacity=".6"/>
+    ${shapes}
+    <circle cx="${cx}" cy="${cy}" r="81" fill="${t.paper}"/>
+    <circle cx="${cx}" cy="${cy}" r="74" fill="none" stroke="${t.gold}" stroke-width="1"/>
+    <text class="display" x="${cx}" y="348" text-anchor="middle" font-size="76" style="fill:${t.ink}">29</text>
+    <text class="sans" x="${cx}" y="376" text-anchor="middle" font-size="14" font-weight="600" letter-spacing="2.8" style="fill:${t.accent}">OCTOBER</text>
+  </g>`.replaceAll('\n+', '\n');
}

function poster(t) {
  const sister = t.name === 'Sisters';
  const background = sister ? '#F9E8E8' : '#082D36';
  const foreground = sister ? t.ink : t.paper;
  const quiet = sister ? '#7D4860' : '#C2DAD8';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" role="img" aria-labelledby="title description">
  <title id="title">Qur’an Class Celebration — ${t.side}</title>
  <desc id="description">HBIC Qur’an Academy, Masjid Bilal, Calgary. Thursday, October 29, 2026, 5:30–7:30 PM. The centre programme field is intentionally empty.</desc>
  <defs>
    <linearGradient id="fold-light" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${sister ? '#F4C8CB' : '#4BABA4'}"/><stop offset=".65" stop-color="${sister ? '#CD8094' : '#257E80'}"/><stop offset="1" stop-color="${t.accent}"/></linearGradient>
    <linearGradient id="fold-dark" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${sister ? '#C58098' : '#207A7D'}"/><stop offset="1" stop-color="${sister ? '#8F3E63' : '#0C4F5D'}"/></linearGradient>
    <linearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${t.accent}"/><stop offset=".5" stop-color="${sister ? '#C7788A' : '#419894'}"/><stop offset="1" stop-color="${t.accent}"/></linearGradient>
    <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFFCF5"/><stop offset="1" stop-color="${t.paper}"/></linearGradient>
    <filter id="paper-shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="10" flood-color="${t.ink}" flood-opacity=".22"/></filter>
  </defs>
  <style>
    text { fill: ${foreground}; text-rendering: geometricPrecision; }
    .sans { font-family: 'Avenir Next', Arial, sans-serif; }
    .display { font-family: Didot, 'Bodoni 72', Georgia, serif; }
    .serif { font-family: Georgia, 'Times New Roman', serif; }
  </style>
  <rect width="1080" height="1350" fill="${background}"/>
  <path d="M1080 101C747 101 701 175 701 337S747 573 1080 573" fill="none" stroke="${sister ? '#E9C4D0' : '#13515A'}" stroke-width="105"/>
  <path d="M1080 98C740 98 681 175 681 337S740 576 1080 576" fill="none" stroke="${t.gold}" stroke-width=".8" opacity=".55"/>
  <path d="M23 0V1350M1057 0V1350" stroke="${t.gold}" opacity=".4"/>
  <image x="62" y="53" width="68" height="68" href="data:image/png;base64,${logo}"/>
  <text class="sans" x="148" y="81" font-size="23" font-weight="600" letter-spacing="2">HBIC QUR’AN ACADEMY</text>
  <text class="sans" x="148" y="111" font-size="17" letter-spacing=".8" style="fill:${quiet}">Masjid Bilal · Calgary</text>
  <text class="sans" x="1018" y="92" text-anchor="end" font-size="18" font-weight="600" letter-spacing="2.3">${t.side}</text>
  <path d="M62 146H1018" stroke="${t.gold}" stroke-width=".8"/>

  <text class="display" x="64" y="272" font-size="132" letter-spacing="-4">Qur’an</text>
  <text class="display" x="67" y="398" font-size="130" letter-spacing="-4">Class</text>
  <text class="display" x="62" y="491" font-size="96" font-style="italic" letter-spacing="-2.3" style="fill:${sister ? '#A94E73' : '#E3C785'}">Celebration</text>
  <path d="M67 530H121" stroke="${t.gold}" stroke-width="2"/>
  <text class="sans" x="139" y="538" font-size="20" letter-spacing=".2" style="fill:${quiet}">A special end-of-month class</text>
  ${rosette(t)}

  <path d="M92 619L1014 601L1024 1208L78 1225Z" fill="${sister ? '#EBC5CC' : '#367C80'}"/>
  <path d="M55 608L998 626L1007 1200L64 1216Z" fill="${sister ? '#B76A83' : '#174F59'}" stroke="${t.gold}" stroke-width=".7"/>
  <g filter="url(#paper-shadow)">
    <path d="M62 586H1018V1196H62Z" fill="url(#paper)"/>
    <path d="M62 586H1018V716H62Z" fill="${sister ? '#6B304E' : '#17636C'}"/>
    <path d="M83 605H997M83 697H997" stroke="${t.gold}" stroke-opacity=".75" stroke-width=".7"/>
    <text class="display" x="103" y="678" font-size="81" style="fill:#FFFAEF">29</text>
    <path d="M237 618V686M647 618V686" stroke="${t.gold}" stroke-opacity=".65"/>
    <text class="sans" x="266" y="646" font-size="24" font-weight="600" letter-spacing="2" style="fill:#FFFAEF">THURSDAY</text>
    <text class="sans" x="266" y="679" font-size="22" letter-spacing=".7" style="fill:#FFFAEF">OCTOBER 2026</text>
    <text class="sans" x="982" y="660" text-anchor="end" font-size="34" font-weight="600" letter-spacing="-.8" style="fill:#FFFAEF">5:30–7:30 PM</text>
    <path d="M83 736H997" stroke="${t.line}" stroke-width=".8" stroke-dasharray="3 6"/>
    <circle cx="62" cy="736" r="12" fill="${background}"/><circle cx="1018" cy="736" r="12" fill="${background}"/>
    <text class="display" x="103" y="795" font-size="39" style="fill:${t.ink}">The programme</text>
    <path d="M431 783H976" stroke="${t.line}"/>
    <!-- This entire field remains empty until the final programme is supplied. -->
    <rect id="programme-space" x="103" y="824" width="874" height="290" fill="none"/>
    <path d="M104 834V823H115M965 823H976V834M104 1104V1115H115M965 1115H976V1104" fill="none" stroke="${t.gold}" stroke-width=".8"/>
    <path d="M103 1146H977" stroke="${t.line}" stroke-width=".8"/>
    <text class="sans" x="104" y="1176" font-size="15" letter-spacing="2" style="fill:${t.accent}">QUR’AN · COMMUNITY · CELEBRATION</text>
    <text class="sans" x="977" y="1176" text-anchor="end" font-size="15" letter-spacing="2" style="fill:${t.accent}">${t.side}</text>
  </g>
  <text class="serif" x="540" y="1284" text-anchor="middle" font-size="24" style="fill:${foreground}">Celebrating a month of learning,</text>
  <text class="serif" x="540" y="1318" text-anchor="middle" font-size="24" style="fill:${foreground}">recitation &amp; growing together.</text>
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
