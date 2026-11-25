import { execFileSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const width = 1920;
const height = 1080;
const ink = "#091724";
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

function coverFrame(video, ffmpeg) {
  return execFileSync(ffmpeg, [
    "-nostdin", "-v", "error", "-ss", "33.36667", "-i", video,
    "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-",
  ], { maxBuffer: 12_000_000 });
}

function gradedPhoto(frame, crop, size) {
  return sharp(frame)
    .extract(crop)
    .resize(size)
    .modulate({ brightness: 1.06, saturation: 0.84 })
    .sharpen({ sigma: 0.75, m1: 0.3, m2: 1.15 })
    .png().toBuffer();
}

function backdrop(width, height) {
  return sharp({ create: { width, height, channels: 3, background: ink } });
}

async function landscapeCover(frame) {
  const photo = await gradedPhoto(frame, { left: 120, top: 74, width: 1250, height: 940 }, { height });
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
  return backdrop(width, height).composite([
    { input: photo, left: width - photoWidth, top: 0 },
    { input: shade, left: 0, top: 0 },
    { input: mark, left: 105, top: 84 },
    { input: await label("HBIC COMMUNITY FILM", 39, ivory, 3), left: 241, top: 123 },
    { input: await label("MASJID", 195, ivory, -5, true), left: 103, top: 305 },
    { input: await label("BILAL", 223, amber, -6, true), left: 102, top: 510 },
    { input: await label("CALGARY, ALBERTA", 49, ivory, 4), left: 111, top: 836 },
  ]).png().toBuffer();
}

async function instagramCover(frame, output) {
  const photo = await gradedPhoto(frame, { left: 650, top: 90, width: 840, height: 940 }, { width: 1080 });
  const shade = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>
      <linearGradient id="portrait" x2="0" y2="1">
        <stop offset=".085" stop-color="${ink}"/>
        <stop offset=".17" stop-color="${ink}" stop-opacity=".66"/>
        <stop offset=".28" stop-color="${ink}" stop-opacity=".04"/>
        <stop offset=".42" stop-color="${ink}" stop-opacity=".06"/>
        <stop offset=".59" stop-color="${ink}" stop-opacity=".92"/>
        <stop offset=".68" stop-color="${ink}"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1920" fill="url(#portrait)"/>
    <rect x="95" y="1451" width="72" height="5" rx="2.5" fill="${amber}"/>
  </svg>`);
  const mark = await sharp(logoFile).resize(94, 94).png().toBuffer();
  await backdrop(1080, 1920).composite([
    { input: photo, left: 0, top: 158 },
    { input: shade, left: 0, top: 0 },
    { input: mark, left: 88, top: 272 },
    { input: await label("HBIC COMMUNITY FILM", 33, ivory, 2), left: 201, top: 305 },
    { input: await label("MASJID", 167, ivory, -5, true), left: 86, top: 1042 },
    { input: await label("BILAL", 194, amber, -6, true), left: 85, top: 1216 },
    { input: await label("CALGARY, ALBERTA", 40, ivory, 3), left: 94, top: 1487 },
  ]).jpeg({ quality: 93, chromaSubsampling: "4:4:4" }).toFile(output);
}

function saveYouTubeCover(cover, output) {
  return sharp(cover).jpeg({ quality: 94, chromaSubsampling: "4:4:4" }).toFile(output);
}

export async function renderHbicYouTubeThumbnail(video, output, ffmpeg = "ffmpeg") {
  await saveYouTubeCover(await landscapeCover(coverFrame(video, ffmpeg)), output);
}

export async function renderHbicTrailerCovers(video, directory, ffmpeg = "ffmpeg") {
  await mkdir(directory, { recursive: true });
  const frame = coverFrame(video, ffmpeg);
  const cover = await landscapeCover(frame);
  await Promise.all([
    saveYouTubeCover(cover, join(directory, "YouTube Thumbnail.jpg")),
    instagramCover(frame, join(directory, "Instagram Cover.jpg")),
    sharp(cover).resize({ width: 1536 }).jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toFile(join(directory, "poster.jpg")),
  ]);
}

if (import.meta.main) {
  const [video, output, mode] = process.argv.slice(2);
  if (!video || !output) throw new Error("Supply the November 25 film master and a JPEG path, or an output directory followed by --all.");
  if (mode === "--all") await renderHbicTrailerCovers(video, output, process.env.FFMPEG);
  else await renderHbicYouTubeThumbnail(video, output, process.env.FFMPEG);
}
