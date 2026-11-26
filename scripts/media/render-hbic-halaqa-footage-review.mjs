import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { filmEnd } from "./community-film-timeline.mjs";
import { titlePaths } from "./hbic-film-titles.mjs";

const [review, camera, destination] = process.argv.slice(2);
if (!destination) throw new Error("Provide the Original Style Review, graded August 8 camera extract, and a private output folder.");

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const fps = 30;
const [first, end] = [2271, 2347];
const length = end - first;
const photoStart = 107; // The extract starts at 00:40 in the camera original.
const seconds = frame => (frame / fps).toFixed(6);

function render(args) {
  execFileSync(ffmpeg, ["-nostdin", "-hide_banner", "-y", "-v", "error", "-xerror", ...args], { stdio: "inherit" });
}

function probe(path) {
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries",
    "stream=codec_type,nb_frames,start_time,duration", "-of", "json", path], { encoding: "utf8" })).streams;
}

async function verifyInput(path, expected) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(path)) hash.update(bytes);
  if (hash.digest("hex") !== expected) throw new Error(`Unexpected source bytes in ${path}`);
}

async function renderTitle(work) {
  const pattern = join(work, "halaqa-night-%03d.png");
  const title = titlePaths("HALAQA", { x: 1600, top: 152, height: 65, maxWidth: 484 })
    + titlePaths("NIGHT", { x: 1600, top: 238, height: 65, maxWidth: 484 });
  // Match the rapid soft reveal and short fade from the archived title.
  for (let frame = 0; frame < length; frame++) {
    const alpha = Math.max(0, Math.min(1, (frame - 6) / 7, (69 - frame) / 7));
    const blur = (1 - alpha) * 6 + 0.3;
    const layer = `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="365"><defs>
      <radialGradient id="shade"><stop stop-color="#12181d" stop-opacity=".34"/>
        <stop offset="1" stop-color="#12181d" stop-opacity="0"/></radialGradient>
      <filter id="ink" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="${blur}"/></filter>
      <filter id="bloom" x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="7"/></filter>
      </defs><g opacity="${alpha}"><ellipse cx="1600" cy="226" rx="318" ry="115" fill="url(#shade)"/>
      <g filter="url(#bloom)" opacity=".56">${title}</g><g filter="url(#ink)">${title}</g></g></svg>`;
    await sharp(Buffer.from(layer)).png().toFile(pattern.replace("%03d", String(frame).padStart(3, "0")));
  }
  return pattern;
}

await Promise.all([
  verifyInput(review, "0f98d14526cbf7bc243cf99938d138b543725656c4ecd1ee0ebf4a84bd1e9497"),
  verifyInput(camera, "f471bafb337558c41425333af415f5e51dbaad6198715ad6227e781402ebcc04"),
]);
await mkdir(destination, { recursive: true });
const work = await mkdtemp(join(destination, ".halaqa-"));
try {
  const title = await renderTitle(work);
  const segment = join(work, "halaqa.mp4");
  render([
    "-i", camera, "-framerate", "30", "-i", title,
    "-filter_complex_threads", "2", "-filter_complex", [
      `[0:v]trim=start_frame=${photoStart}:end_frame=${photoStart + length},settb=1/30,setpts=N[shot]`,
      "[shot][1:v]overlay=shortest=1:format=yuv420,"
        + "setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709[out]",
    ].join(";"), "-map", "[out]", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-threads", "3",
    "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p", "-video_track_timescale", "15360", segment,
  ]);
  render([
    "-i", review, "-map", "0:v:0", "-c:v", "copy", "-f", "segment", "-segment_times", [first, end].map(seconds).join(","),
    "-segment_time_delta", "0.016667", "-reset_timestamps", "1", "-segment_format_options", "video_track_timescale=15360",
    join(work, "review-%d.mp4"),
  ]);
  const frameCount = Math.round(filmEnd * fps);
  for (const [name, frames] of [["review-0.mp4", first], ["halaqa.mp4", length], ["review-2.mp4", frameCount - end]]) {
    if (Number(probe(join(work, name))[0]?.nb_frames) !== frames) throw new Error(`Unexpected frame count in ${name}.`);
  }
  const concat = join(work, "picture.ffconcat");
  await writeFile(concat, `ffconcat version 1.0\nfile 'review-0.mp4'\nduration ${seconds(first)}\nfile 'halaqa.mp4'\nduration ${seconds(length)}\nfile 'review-2.mp4'\n`);
  const complete = join(work, "complete.mp4");
  render([
    "-f", "concat", "-safe", "0", "-i", concat, "-i", review, "-map", "0:v:0", "-map", "1:a:0", "-map_metadata", "1",
    "-c", "copy", "-video_track_timescale", "15360", "-movflags", "+faststart+write_colr", complete,
  ]);
  const [picture, sound] = probe(complete);
  if (Number(picture?.nb_frames) !== frameCount || Number(sound?.nb_frames) !== 9700
      || [picture, sound].some(stream => stream.start_time !== "0.000000" || stream.duration !== seconds(frameCount))) {
    throw new Error("The new footage changed the timeline.");
  }
  const output = join(destination, "Masjid Bilal Trailer - Halaqa Footage Review.mp4");
  await chmod(complete, 0o600);
  await rename(complete, output);
  console.log(output);
} finally {
  await rm(work, { recursive: true, force: true });
}
