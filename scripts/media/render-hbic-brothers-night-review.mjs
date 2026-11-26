import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { brothersNightEnd, filmEnd, gradedBrothersNight, sources } from "./community-film-timeline.mjs";
import { titlePaths, typeOnHeadline } from "./hbic-film-titles.mjs";

const [archive, review, clips, destination] = process.argv.slice(2);
if (!destination) throw new Error("Provide the original film, motion review, graded clips directory and a private output directory.");

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const fps = 30;
const frameCount = Math.round(filmEnd * fps);
const splice = [2473, 3401]; // The enclosing keyframes in the verified Motion Review.
const joinFrames = 10;
const first = gradedBrothersNight[0].at - 6 - joinFrames;
const resume = brothersNightEnd + 6 + joinFrames;
const frames = resume - first;
const exit = frames - 24;
const seconds = frame => (frame / fps).toFixed(6);
const frameTimes = "settb=1/30,setpts=N";
const width = 1920;
const height = 1080;
const panelWidth = 448;
const panelHeight = 796;
const panelLeft = (width - panelWidth) / 2 - 8;
const panelTop = 226 - 3;
const encode = [
  "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-threads", "4", "-r", "30",
  "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p", "-video_track_timescale", "15360",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
  "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",
];

function render(args) {
  execFileSync(ffmpeg, ["-hide_banner", "-nostdin", "-y", "-v", "error", ...args], { stdio: "inherit" });
}

async function verifyInput(file, expected) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  if (hash.digest("hex") !== expected) throw new Error(`Unexpected source bytes in ${file}`);
}

function artwork(content, w, h) {
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${content}</svg>`));
}

async function writeArtwork(work) {
  const plate = join(work, "original-contours.png");
  render(["-ss", "44.1", "-i", archive, "-frames:v", "1", "-update", "1", plate]);
  const mask = join(work, "portrait-mask.png");
  const rim = join(work, "portrait-edge.png");
  const title = join(work, "title-%03d.png");
  await Promise.all([
    artwork(`<rect width="${panelWidth}" height="${panelHeight}" rx="35" fill="#fff"/>`, panelWidth, panelHeight)
      .flatten({ background: "#000" }).png().toFile(mask),
    artwork(`<defs><linearGradient id="rim" x2="1" y2="1"><stop stop-color="#e9d6a6" stop-opacity=".78"/><stop offset="1" stop-color="#e1c186" stop-opacity=".3"/></linearGradient></defs>
      <rect x="2" y="3" width="${panelWidth + 12}" height="${panelHeight + 13}" rx="41" fill="#000" opacity=".54"/>
      <rect x="6" y="1" width="${panelWidth + 4}" height="${panelHeight + 4}" rx="38" fill="#101210" stroke="url(#rim)" stroke-width="2"/>`, panelWidth + 16, panelHeight + 18)
      .png().toFile(rim),
  ]);
  const gold = "#dfc58c";
  const date = titlePaths("NOVEMBER 2025", { top: 181, height: 26, spacing: 12, fill: gold });
  for (let frame = 0; frame <= 36; frame++) {
    const alpha = Math.max(0, Math.min(1, (frame - 27) / 9));
    await artwork(`<defs><filter id="bloom" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>
      ${typeOnHeadline("BROTHERS NIGHT", frame, 12, 77, 75)}
      <g opacity="${alpha}"><path d="M667 194h42m502 0h42" stroke="${gold}" stroke-width="2" opacity=".82"/>${date}</g>`, width, 220)
      .png().toFile(title.replace("%03d", String(frame).padStart(3, "0")));
  }
  return { plate, mask, rim, title };
}

function picture(file) {
  return ["-framerate", "30", "-i", file];
}

function ease(start, duration) {
  const progress = `clip((n-1-${start})/${duration},0,1)`;
  return `(${progress}^2*(3-2*${progress}))`;
}

function renderMiddle(work, { plate, mask, rim, title }) {
  const original = join(work, "original-1.mp4");
  const inputs = ["-threads", "2", "-i", original, ...picture(plate), ...picture(title)];
  const graph = [`[1:v]format=rgba,tpad=stop_mode=clone:stop=${frames - 1}[plate]`];
  const exchanges = gradedBrothersNight.slice(1).map(shot => ease(shot.at - first - 8, 16));
  const firstEntrance = ease(joinFrames + 4, 18);
  const lastExit = ease(exit, 18);
  const travels = [
    { x: `-1224*(1-${firstEntrance})-1224*${exchanges[0]}`, y: "0" },
    { x: `1224*(1-${exchanges[0]})+1224*${exchanges[1]}`, y: "0" },
    { x: `-1224*(1-${exchanges[1]})-1224*${exchanges[2]}`, y: "0" },
    { x: "0", y: `900*(1-${exchanges[2]})+900*${lastExit}` },
  ];
  let base = "plate";
  for (const [i, shot] of gradedBrothersNight.entries()) {
    const input = 3 + i * 3;
    const lead = shot.at - first;
    const tail = frames - lead - shot.frames;
    inputs.push("-threads", "2", "-i", join(clips, shot.file), ...picture(mask), ...picture(rim));
    // The extracts carry the SDR grade. Crop inside their previous baked-in frame.
    graph.push(
      `[${input}:v]trim=end_frame=${shot.frames},${frameTimes},crop=440:782:740:144,scale=${panelWidth}:${panelHeight}:flags=lanczos,setsar=1,format=rgba[clip${i}]`,
      `[${input + 1}:v]format=gray,tpad=stop_mode=clone:stop=${shot.frames - 1}[mask${i}]`,
      `[clip${i}][mask${i}]alphamerge[portrait${i}]`,
      `[${input + 2}:v]format=rgba,tpad=stop_mode=clone:stop=${shot.frames - 1}[rim${i}]`,
      `[rim${i}][portrait${i}]overlay=x=8:y=3:format=auto:shortest=1,tpad=start_mode=clone:start=${lead}:stop_mode=clone:stop=${tail},${frameTimes}[card${i}]`,
      `[${base}][card${i}]overlay=x='${panelLeft}+${travels[i].x}':y='${panelTop}+${travels[i].y}':format=auto:shortest=1[panel${i}]`,
    );
    base = `panel${i}`;
  }

  // Hide the old dissolves under the new chapter. The moving archive footage
  // shows through the new joins on either side of the previous gallery.
  graph.push(
    `[2:v]format=rgba,tpad=stop_mode=clone:stop=${frames},fade=t=out:s=${exit + 4}:n=12:alpha=1[type]`,
    `[${base}][type]overlay=format=auto:shortest=1,format=yuva420p,fade=t=in:s=0:n=${joinFrames}:alpha=1,fade=t=out:s=${frames - joinFrames}:n=${joinFrames}:alpha=1,settb=1/30,setpts=N+${first - splice[0]}[chapter]`,
    `[0:v]${frameTimes}[archive]`,
    "[archive][chapter]overlay=eof_action=pass:format=yuv420[out]",
  );
  render([
    ...inputs, "-filter_complex_threads", "2", "-filter_complex", graph.join(";"),
    "-map", "[out]", "-frames:v", String(splice[1] - splice[0]), ...encode, join(work, "middle.mp4"),
  ]);
}

await Promise.all([
  verifyInput(archive, sources.archive),
  verifyInput(review, "b872e5c075f207e1609892ff5b864173338697a249ebcc81da3cda0e46179fc2"),
  ...gradedBrothersNight.map(({ file, hash }) => verifyInput(join(clips, file), hash)),
]);
await mkdir(destination, { recursive: true });
const work = await mkdtemp(join(destination, ".brothers-night-"));
try {
  render([
    "-i", review, "-map", "0:v:0", "-c:v", "copy", "-f", "segment", "-segment_times", splice.map(seconds).join(","),
    "-segment_time_delta", "0.016667", "-reset_timestamps", "1",
    "-segment_format_options", "video_track_timescale=15360", join(work, "original-%d.mp4"),
  ]);
  renderMiddle(work, await writeArtwork(work));
  const list = join(work, "film.ffconcat");
  await writeFile(list, `ffconcat version 1.0\nfile 'original-0.mp4'\nduration ${seconds(splice[0])}\nfile 'middle.mp4'\nduration ${seconds(splice[1] - splice[0])}\nfile 'original-2.mp4'\n`);
  const temp = join(work, "review.mp4");
  render([
    "-f", "concat", "-safe", "0", "-i", list, "-i", review,
    "-map", "0:v:0", "-map", "1:a:0", "-map_metadata", "1", "-c", "copy",
    "-video_track_timescale", "15360", "-movflags", "+faststart+write_colr", temp,
  ]);
  const { streams } = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "stream=codec_type,start_time,duration,nb_frames", "-of", "json", temp,
  ], { encoding: "utf8" }));
  const video = streams.find(stream => stream.codec_type === "video");
  const audio = streams.find(stream => stream.codec_type === "audio");
  if (streams.length !== 2 || Number(video?.nb_frames) !== frameCount || Number(audio?.nb_frames) !== 9700 ||
      streams.some(stream => stream.start_time !== "0.000000" || stream.duration !== seconds(frameCount))) {
    throw new Error("The replacement chapter changed the video or audio timing.");
  }
  const output = join(destination, "Masjid Bilal Trailer - Brothers Night Review.mp4");
  await rename(temp, output);
  console.log(output);
} finally {
  await rm(work, { recursive: true, force: true });
}
