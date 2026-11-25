import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const width = 1920;
const height = 1080;
const ivory = "#fffaf0";
const amber = "#efc469";
const heavyFont = fileURLToPath(new URL("./fonts/Montserrat-Black.ttf", import.meta.url));
const mediumFont = fileURLToPath(new URL("./fonts/Montserrat-Medium.ttf", import.meta.url));
const logoFile = fileURLToPath(new URL("../../apps/public-web/public/brand/hbic-logo.png", import.meta.url));

async function label(text, size, color, tracking = 0, heavy = false) {
  return sharp({ text: {
    text: `<span foreground="${color}" letter_spacing="${tracking * 1024}">${text}</span>`,
    font: `${heavy ? "Montserrat Black" : "Montserrat Medium"} ${size}`,
    fontfile: heavy ? heavyFont : mediumFont,
    rgba: true,
    dpi: 72,
  } }).png().toBuffer();
}

export async function renderHbicYouTubeThumbnail(video, output, ffmpeg = "ffmpeg") {
  const decoded = execFileSync(ffmpeg, [
    "-nostdin", "-v", "error", "-ss", "33.95", "-i", video,
    "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-",
  ], { maxBuffer: 12_000_000 });
  const photo = await sharp(decoded)
    .extract({ left: 120, top: 74, width: 1250, height: 940 })
    .resize({ height, kernel: "lanczos3" })
    .modulate({ brightness: 1.06, saturation: 0.84 })
    .sharpen({ sigma: 0.75, m1: 0.3, m2: 1.15 })
    .png().toBuffer();
  const photoWidth = (await sharp(photo).metadata()).width;
  const shade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080">
    <defs>
      <linearGradient id="text" x2="1" y2="0">
        <stop stop-color="#091724"/><stop offset=".255" stop-color="#091724"/>
        <stop offset=".46" stop-color="#091724" stop-opacity=".86"/>
        <stop offset=".61" stop-color="#091724" stop-opacity=".27"/>
        <stop offset=".76" stop-color="#091724" stop-opacity="0"/>
      </linearGradient>
      <linearGradient id="edges" x2="0" y2="1">
        <stop stop-color="#081522" stop-opacity=".29"/><stop offset=".37" stop-color="#081522" stop-opacity="0"/>
        <stop offset=".72" stop-color="#081522" stop-opacity="0"/><stop offset="1" stop-color="#081522" stop-opacity=".62"/>
      </linearGradient>
    </defs>
    <rect width="1920" height="1080" fill="url(#text)"/>
    <rect width="1920" height="1080" fill="url(#edges)"/>
    <rect x="113" y="796" width="79" height="5" rx="2.5" fill="${amber}"/>
  </svg>`);
  const mark = await sharp(logoFile).resize(112, 112).png().toBuffer();
  await sharp({ create: { width, height, channels: 3, background: "#091724" } }).composite([
    { input: photo, left: width - photoWidth, top: 0 },
    { input: shade, left: 0, top: 0 },
    { input: mark, left: 105, top: 84 },
    { input: await label("HBIC COMMUNITY FILM", 39, ivory, 3), left: 241, top: 123 },
    { input: await label("MASJID", 195, ivory, -5, true), left: 103, top: 305 },
    { input: await label("BILAL", 223, amber, -6, true), left: 102, top: 510 },
    { input: await label("CALGARY, ALBERTA", 49, ivory, 4), left: 111, top: 836 },
  ]).jpeg({ quality: 94, chromaSubsampling: "4:4:4" }).toFile(output);
}

if (import.meta.main) {
  const [video, output] = process.argv.slice(2);
  if (!video || !output) throw new Error("Supply the November 25 community film master and a JPEG output path.");
  await renderHbicYouTubeThumbnail(video, output, process.env.FFMPEG);
}
