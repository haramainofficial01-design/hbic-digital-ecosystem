import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, rename } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { sources } from "./community-film-timeline.mjs";

const [archive, baseFilm, gradedDirectory, destination] = process.argv.slice(2);
if (!destination) {
  throw new Error("Provide the original film, November 20 master, November 20 graded clips directory and a private output directory.");
}

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const fps = 30;
const frameCount = 6207;
const dissolveFrames = 12;
const halfDissolve = dissolveFrames / 2;
const shots = [
  { file: "brothers-1.mp4", at: 2580, frames: 165, hash: "e0d96846ee83d7f5875811254e98463f06203eeb3f743dc4b53e9933a51da017" },
  { file: "brothers-2.mp4", at: 2745, frames: 90, hash: "211631f1adcdf013a0b03e6695202bc8231026fd9a4b362aa557a0cb8ef10d76" },
  { file: "brothers-3.mp4", at: 2835, frames: 225, hash: "5c5a8a60e78b311f8f1d2d4fb93071c8e2af184c3931c994ff9f1a7edcfa2875" },
  { file: "brothers-4.mp4", at: 3060, frames: 285, hash: "2ad51bfec6e6886912fabe6fe2393792d92b94e63db3ede082fc1493ae6cf69a" },
];
const returnToArchive = 3345;
const montageBridge = { start: 1314, resume: 1325 };
const closingBridge = { start: 5893, resume: 5928 };
const rec709 = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv"];
const encode = [
  "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-threads", "4", "-pix_fmt", "yuv420p",
  "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",
  ...rec709, "-video_track_timescale", "15360",
];

async function verifySource(file, expected) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  if (hash.digest("hex") !== expected) throw new Error(`Unexpected source bytes in ${file}`);
}

function render(args) {
  execFileSync(ffmpeg, ["-hide_banner", "-nostdin", "-v", "error", "-y", ...args], { stdio: "inherit" });
}

function stillAt(file, second) {
  return execFileSync(ffmpeg, [
    "-nostdin", "-v", "error", "-ss", String(second), "-i", file,
    "-frames:v", "1", "-f", "image2pipe", "-c:v", "png", "-",
  ], { maxBuffer: 8_000_000 });
}

await Promise.all([
  verifySource(archive, sources.archive),
  verifySource(baseFilm, sources.sound),
  ...shots.map(({ file, hash }) => verifySource(join(gradedDirectory, file), hash)),
]);
await mkdir(destination, { recursive: true });
const work = join(destination, "review-work");
await mkdir(work, { recursive: true });

// The original montage reveals its full, unlettered contour artwork at 44.1 seconds.
const frame = stillAt(archive, 44.1);
const backdropFile = join(work, "original-contours.png");
const rim = Buffer.from('<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect x="704.5" y="90.5" width="511" height="899" rx="33" fill="#10110f" stroke="#bba46b" stroke-opacity=".72"/></svg>');
await sharp(frame).composite([{ input: rim, top: 0, left: 0 }]).png().toFile(backdropFile);
const maskFile = join(work, "portrait-mask.png");
await sharp(Buffer.from('<svg width="500" height="888" xmlns="http://www.w3.org/2000/svg"><rect width="500" height="888" fill="black"/><rect width="500" height="888" rx="28" fill="white"/></svg>'))
  .png().toFile(maskFile);

const inserts = [];
for (const shot of shots) {
  const output = join(work, `gallery-${shot.at}.mp4`);
  // The November 20 source already contains the verified HDR-to-SDR grade.
  // Sample inside its photo frame to exclude the burned-in border and lettering.
  const graph = [
    "[0:v]crop=440:782:740:144,scale=500:888:flags=lanczos,setsar=1,format=rgba[camera]",
    "[2:v]format=gray[mask]",
    "[camera][mask]alphamerge[portrait]",
    "[1:v][portrait]overlay=710:96:shortest=1,format=yuv420p[gallery]",
  ];
  render([
    "-i", join(gradedDirectory, shot.file),
    "-loop", "1", "-framerate", String(fps), "-i", backdropFile,
    "-loop", "1", "-framerate", String(fps), "-i", maskFile,
    "-filter_complex_threads", "2", "-filter_complex", graph.join(";"), "-map", "[gallery]", "-an",
    "-frames:v", String(shot.frames), ...encode, output,
  ]);
  inserts.push(output);
  console.log(`Prepared the framed camera shot at ${shot.at / fps}s.`);
}

// Use adjacent images from the original edit to span its two short black gaps.
async function renderBridge({ start, resume }) {
  const first = join(work, `bridge-${start}-out.png`);
  const last = join(work, `bridge-${start}-in.png`);
  const output = join(work, `bridge-${start}.mp4`);
  const frameTime = index => (index - 0.001) / fps;
  await Promise.all([
    sharp(stillAt(baseFilm, frameTime(start - 1))).png().toFile(first),
    sharp(stillAt(baseFilm, frameTime(resume))).png().toFile(last),
  ]);
  render([
    "-loop", "1", "-framerate", String(fps), "-i", first,
    "-loop", "1", "-framerate", String(fps), "-i", last,
    "-filter_complex_threads", "2",
    "-filter_complex", `[0:v][1:v]xfade=transition=fade:offset=0:duration=${(resume - start + 1) / fps}[bridge]`,
    "-map", "[bridge]", "-an", "-frames:v", String(resume - start), ...encode, output,
  ]);
  return output;
}
const bridges = [await renderBridge(montageBridge), await renderBridge(closingBridge)];

// Retain the authored typography and motion from the archival sections. Replace
// the added gallery and its joins while retaining both original title sequences.
const graph = [
  "[0:v]split=4[opening][montage][ending][logo]",
  `[opening]trim=end_frame=${montageBridge.start},setpts=PTS-STARTPTS[first]`,
  `[montage]trim=start_frame=${montageBridge.resume}:end_frame=${shots[0].at - halfDissolve},setpts=PTS-STARTPTS[second]`,
  `[first][5:v][second]concat=n=3:v=1:a=0,tpad=stop_mode=clone:stop=${dissolveFrames},settb=1/30,setpts=N[part0]`,
  ...shots.map((shot, index) =>
    `[${index + 1}:v]trim=end_frame=${shot.frames},setpts=PTS-STARTPTS,tpad=start_mode=clone:start=${halfDissolve}:stop_mode=clone:stop=${halfDissolve},settb=1/30,setpts=N[part${index + 1}]`),
  `[ending]trim=start_frame=${returnToArchive + halfDissolve}:end_frame=${closingBridge.start},setpts=PTS-STARTPTS[third]`,
  `[logo]trim=start_frame=${closingBridge.resume},setpts=PTS-STARTPTS[fourth]`,
  `[third][6:v][fourth]concat=n=3:v=1:a=0,tpad=start_mode=clone:start=${dissolveFrames},settb=1/30,setpts=N[part5]`,
];
for (const [index, cut] of [...shots.map(shot => shot.at), returnToArchive].entries()) {
  const left = index === 0 ? "part0" : `join${index - 1}`;
  const offset = (cut - halfDissolve) / fps;
  graph.push(`[${left}][part${index + 1}]xfade=transition=fade:duration=${dissolveFrames / fps}:offset=${offset}[join${index}]`);
}
graph.push(`[join4]trim=end_frame=${frameCount},format=yuv420p[out]`);

const draft = join(work, "review.mp4");
const output = join(destination, "Masjid Bilal Trailer - Private Review.mp4");
render([
  "-threads", "2", "-i", baseFilm, ...[...inserts, ...bridges].flatMap(file => ["-threads", "2", "-i", file]),
  "-filter_complex_threads", "2", "-filter_complex", graph.join(";"),
  "-map", "[out]", "-map", "0:a:0", ...encode, "-c:a", "copy",
  "-movflags", "+faststart+write_colr", "-map_metadata", "0", draft,
]);
await rename(draft, output);
console.log(output);
