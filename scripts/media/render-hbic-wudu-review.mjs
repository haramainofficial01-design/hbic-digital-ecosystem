import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { sources } from "./community-film-timeline.mjs";
import { titlePaths } from "./hbic-film-titles.mjs";

const [archive, review, destination] = process.argv.slice(2);
if (!destination) throw new Error("Provide the original film, first private review and a private output directory.");

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const fps = 30;
const frameCount = 6207;
const tailKeyframe = 5080;
const lastCleanQuote = 5164;
const dissolve = 12;
const half = dissolve / 2;
const seconds = frame => (frame / fps).toFixed(6);
const width = 1920;
const height = 1080;
const gold = "#dfc58c";
const encode = [
  "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-threads", "4", "-r", "30",
  "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p", "-video_track_timescale", "15360",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
  "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",
];
const panels = [[492, 292, 432, 698], [996, 292, 432, 698]];
const originalRoom = [436, 772, 313, 148];
const facilities = [516, 918, 702, 80];
const cleanSeatEnd = 166.83; // The archive begins fading the welcome title over the seats shortly afterward.
const scenes = [
  { at: 5170, id: "before-and-after", title: "FROM THE BEGINNING", labels: ["BEFORE", "COMPLETED"],
    media: [
      { from: 150.92, to: 153.38, crop: originalRoom, speed: 0.65 },
      { from: 166.35, to: cleanSeatEnd, crop: facilities, speed: 0.78, warm: true },
    ] },
  { at: 5370, id: "wudu-area", title: "OUR WUDU AREA", caption: "A SPACE OF DIGNITY",
    media: [
      { from: 157.43, to: 158.00, crop: facilities, speed: 0.68, warm: true },
      { from: 160.35, to: 163.54, crop: facilities, speed: 0.60, warm: true },
    ] },
  { at: 5571, id: "community-support", title: "WITH YOUR SUPPORT", caption: "100% COMMUNITY POWERED",
    media: [
      { from: 164.08, to: 165.83, crop: facilities, speed: 0.61, warm: true },
      { from: 166.24, to: cleanSeatEnd, crop: facilities, speed: 0.76, warm: true },
    ] },
  { at: 5787, id: "thank-you" },
  { at: 5961, id: "closing" },
];

function render(args) {
  execFileSync(ffmpeg, ["-hide_banner", "-nostdin", "-y", "-v", "error", ...args], { stdio: "inherit" });
}

function stillAt(second) {
  return execFileSync(ffmpeg, [
    "-nostdin", "-v", "error", "-ss", String(second), "-i", archive, "-frames:v", "1",
    "-f", "image2pipe", "-c:v", "png", "-",
  ], { maxBuffer: 8_000_000 });
}

async function verifyInput(file, expected) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  if (hash.digest("hex") !== expected) throw new Error(`Unexpected source bytes: ${file}`);
}

function svg(content, w = width, h = height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${content}</svg>`);
}

function headline(text, top, capHeight) {
  const core = titlePaths(text, { top, height: capHeight, maxWidth: 1450 });
  return `<g opacity=".48" filter="url(#bloom)" transform="translate(0 2)">${core}</g>${core}`;
}

async function archiveInk(frame, crop, size) {
  // The artwork is white on pure black. Luminance retains the actual anti-aliased edges.
  const { width: w, height: h } = crop;
  const alpha = await sharp(frame).extract(crop).removeAlpha().greyscale().raw().toBuffer();
  const rgba = await sharp({ create: { width: w, height: h, channels: 3, background: "#fffaf0" } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .png().toBuffer();
  return sharp(rgba).resize(size).png().toBuffer();
}

async function centered(input, top) {
  const { width: imageWidth } = await sharp(input).metadata();
  return { input, top, left: Math.round((width - imageWidth) / 2) };
}

function panelRim([x, y, w, h]) {
  return `<rect x="${x - 6}" y="${y}" width="${w + 12}" height="${h + 14}" rx="41" fill="#000" opacity=".54"/>
    <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="38" fill="#101210" stroke="url(#rim)" stroke-width="2"/>`;
}

async function sceneArtwork(scene, contour, sealFrame, plate, title) {
  const rims = scene.media ? panels.map(panelRim).join("") : "";
  const backing = svg(`<defs>
    <radialGradient id="light" cx="50%" cy="43%" r="62%"><stop stop-color="#ac8247" stop-opacity=".18"/><stop offset="1" stop-color="#080906" stop-opacity="0"/></radialGradient>
    <linearGradient id="rim" x2="1" y2="1"><stop stop-color="#e9d6a6" stop-opacity=".78"/><stop offset="1" stop-color="#e1c186" stop-opacity=".3"/></linearGradient>
    </defs><rect width="1920" height="1080" fill="#090b09" opacity="${scene.media ? ".23" : ".45"}"/>
    <rect width="1920" height="1080" fill="url(#light)"/>${rims}`);
  await sharp(contour).composite([{ input: backing }]).png().toFile(plate);

  let type = "";
  const overlays = [];
  if (scene.media) {
    type = headline(scene.title, 93, 80);
    type += '<path d="M902 211h116" stroke="#dfc58c" stroke-width="2" opacity=".82"/>';
    if (scene.labels) {
      type += panels.map(([x, , w], i) => titlePaths(scene.labels[i], {
        x: x + w / 2, top: 243, height: 30, maxWidth: w, spacing: 11, fill: gold,
      })).join("");
    }
    if (scene.caption) type += titlePaths(scene.caption, { top: 242, height: 30, spacing: 11, fill: gold });
  } else if (scene.id === "thank-you") {
    const emblem = await archiveInk(sealFrame, { left: 743, top: 111, width: 462, height: 586 }, { height: 202 });
    overlays.push(await centered(emblem, 178));
    type = headline("JAZAKUM ALLAHU", 438, 82) + headline("KHAYRAN", 551, 82);
    type += '<path d="M875 697h170" stroke="#dfc58c" stroke-width="2"/>';
    type += titlePaths("EVERY CONTRIBUTION BECAME SOMETHING REAL.", {
      top: 751, height: 32, maxWidth: 1530, spacing: 9, fill: gold,
    });
  } else {
    const mark = await archiveInk(sealFrame, { left: 730, top: 116, width: 484, height: 702 }, { height: 475 });
    const donate = await archiveInk(sealFrame, { left: 682, top: 850, width: 517, height: 85 }, { width: 746 });
    overlays.push(await centered(mark, 135), await centered(donate, 650));
    type = '<path d="M899 804h122" stroke="#dfc58c" stroke-width="2"/>';
    type += titlePaths("HBIC.CA/DONATE", { top: 855, height: 40, spacing: 10, fill: gold });
  }
  const letters = svg(`<defs><filter id="bloom" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>${type}`);
  await sharp(letters).composite(overlays).png().toFile(title);
}

function loop(path) {
  return ["-loop", "1", "-framerate", "30", "-i", path];
}

async function renderScene(scene, index, work, contour, sealFrame, mask) {
  const next = scenes[index + 1];
  const frames = (next?.at ?? frameCount) - scene.at + half + (next ? half : 0);
  const plate = join(work, `${scene.id}-back.png`);
  const title = join(work, `${scene.id}-title.png`);
  const output = join(work, `${scene.id}.mp4`);
  await sceneArtwork(scene, contour, sealFrame, plate, title);

  const inputs = [...loop(plate), ...loop(title)];
  const graph = ["[0:v]format=rgba[plate]"];
  let under = "plate";
  for (const [i, shot] of (scene.media ?? []).entries()) {
    const [x, y, w, h] = panels[i];
    const input = 2 + i * 2;
    inputs.push("-ss", String(shot.from), "-threads", "2", "-i", archive, ...loop(mask));
    const sourceFrames = Math.round((shot.to - shot.from) * fps);
    const prepared = [
      `trim=end_frame=${sourceFrames}`,
      `setpts=(PTS-STARTPTS)/${shot.speed}`,
      `crop=${shot.crop.join(":")}`,
      `scale=${w * 2}:${h * 2}:force_original_aspect_ratio=increase:flags=lanczos`,
      `crop=${w * 2}:${h * 2}`,
    ];
    if (shot.warm) {
      prepared.push("eq=saturation=.79", "colorbalance=rs=.014:bs=-.024:rm=.028:gm=.017:bm=-.032:rh=.012:bh=-.015:pl=1");
    }
    // Continue a slight push through the held end of a short archival shot.
    // Oversampling the crop keeps the move from stepping at output resolution.
    prepared.push(
      "framerate=fps=30", `tpad=stop_mode=clone:stop=${frames}`,
      `zoompan=z='1.005+0.014*(1-cos(PI*on/${frames - 1}))':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=${w}x${h}:fps=30`,
      "setsar=1", "format=rgba",
    );
    graph.push(
      `[${input}:v]${prepared.join(",")}[moving${i}]`,
      `[${input + 1}:v]format=gray[mask${i}]`,
      `[moving${i}][mask${i}]alphamerge[photo${i}]`,
      `[${under}][photo${i}]overlay=x=${x}:y=${y}:shortest=1[panel${i}]`,
    );
    under = `panel${i}`;
  }
  const entry = index === 0 ? "0.40" : "0.21";
  const exit = next ? `,fade=t=out:st=${seconds(frames - 13)}:d=0.32:alpha=1` : "";
  const lastFade = next ? "" : `,fade=t=out:st=${seconds(frames - 19)}:d=0.63:color=0x151610`;
  graph.push(
    `[1:v]format=rgba,fade=t=in:st=${entry}:d=0.34:alpha=1${exit}[type]`,
    `[${under}][type]overlay=x=0:y='8*exp(-7*t)':eval=frame:shortest=1,format=yuv420p${lastFade}[out]`,
  );
  render([
    ...inputs, "-filter_complex_threads", "2", "-filter_complex", graph.join(";"),
    "-map", "[out]", "-frames:v", String(frames), ...encode, output,
  ]);
  console.log(`Reframed ${scene.id}.`);
  return output;
}

await Promise.all([
  verifyInput(archive, sources.archive),
  verifyInput(review, "1562cd81d3edb4e7489106db940fbb222c9ea7b4cb8f28398f597f0ed6caf848"),
]);
await mkdir(destination, { recursive: true });
const work = await mkdtemp(join(destination, ".ending-"));

try {
  render([
    "-i", review, "-map", "0:v:0", "-c:v", "copy", "-f", "segment", "-segment_times", seconds(tailKeyframe),
    "-segment_time_delta", "0.016667", "-reset_timestamps", "1",
    "-segment_format_options", "video_track_timescale=15360", join(work, "original-%d.mp4"),
  ]);
  const contour = stillAt(44.1);
  const sealFrame = stillAt(174.3);
  const mask = join(work, "rounded-photo.png");
  const [, , w, h] = panels[0];
  await sharp(svg(`<rect width="${w}" height="${h}" rx="36" fill="white"/>`, w, h))
    .flatten({ background: "#000" }).png().toFile(mask);
  const shots = [];
  for (const [index, scene] of scenes.entries()) {
    shots.push(await renderScene(scene, index, work, contour, sealFrame, mask));
  }

  // Keep the full archived quote. Hold its last clean frame for its dissolve so
  // the outgoing baked-in panel and off-center captions never show through.
  const quoteFrames = lastCleanQuote - tailKeyframe + 1;
  const edit = [
    `[0:v]trim=end_frame=${quoteFrames},tpad=stop_mode=clone:stop=${dissolve},settb=1/30,setpts=N[quote]`,
    ...shots.map((_, i) => `[${i + 1}:v]settb=1/30,setpts=N[scene${i}]`),
  ];
  for (const [i, scene] of scenes.entries()) {
    const incoming = i === 0 ? "quote" : `join${i - 1}`;
    const offset = seconds(scene.at - tailKeyframe - half);
    edit.push(`[${incoming}][scene${i}]xfade=transition=fade:offset=${offset}:duration=0.400000[join${i}]`);
  }
  edit.push(`[join${scenes.length - 1}]trim=end_frame=${frameCount - tailKeyframe},format=yuv420p[out]`);
  const tail = join(work, "ending.mp4");
  render([
    "-i", join(work, "original-1.mp4"), ...shots.flatMap(shot => ["-threads", "2", "-i", shot]),
    "-filter_complex_threads", "2", "-filter_complex", edit.join(";"), "-map", "[out]",
    ...encode, tail,
  ]);
  const list = join(work, "film.ffconcat");
  await writeFile(list, `ffconcat version 1.0\nfile 'original-0.mp4'\nduration ${seconds(tailKeyframe)}\nfile 'ending.mp4'\n`);
  const temp = join(work, "review.mp4");
  render([
    "-f", "concat", "-safe", "0", "-i", list, "-i", review,
    "-map", "0:v:0", "-map", "1:a:0", "-map_metadata", "1", "-c", "copy",
    "-video_track_timescale", "15360", "-movflags", "+faststart+write_colr", temp,
  ]);
  const { streams } = JSON.parse(execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "stream=codec_type,start_time,duration,nb_frames", "-of", "json", temp,
  ], { encoding: "utf8" }));
  if (streams.length !== 2 || Number(streams[0].nb_frames) !== frameCount ||
      streams.some(stream => stream.start_time !== "0.000000" || stream.duration !== "206.900000")) {
    throw new Error("The replacement ending changed the video or audio timing.");
  }
  const output = join(destination, "Masjid Bilal Trailer - Wudu Area Revision.mp4");
  await rename(temp, output);
  console.log(output);
} finally {
  await rm(work, { recursive: true, force: true });
}
