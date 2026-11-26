import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { brothersNightEnd, filmEnd, gradedBrothersNight, sources } from "./community-film-timeline.mjs";
import { titlePaths, typeOnHeadline } from "./hbic-film-titles.mjs";

const [archive, previous, destination] = process.argv.slice(2);
if (!destination) throw new Error("Provide the original Drive film, Brothers Night Review and a private output directory.");

const ffmpeg = process.env.FFMPEG || "ffmpeg";
const fps = 30;
const total = Math.round(filmEnd * fps);
const insertAt = gradedBrothersNight[0].at;
const insertLength = brothersNightEnd - insertAt;
const width = 1920;
const height = 1080;
const gold = "#dfc58c";
const clock = "settb=1/30,setpts=N";
// The archive declares Rec. 709 transfer and primaries. Set its missing
// matrix on the frames so the encoder keeps their original luminance values.
const rec709 = "setparams=range=tv:color_primaries=bt709:color_trc=bt709:colorspace=bt709";
const blackGaps = [[1037, 1065], [1315, 1320]];
const brothersEntrance = 2564;
const brothersTitle = 2574;
const brothersReturn = 3361;
const hike = { start: 2790, end: 2866, clear: 2866 };
const wuduStart = 5164;
const thankYouStart = 5781;
const sealStart = 5955;
const seal = { start: 5160, hold: 5294, end: 5316 };
const seconds = frames => (frames / fps).toFixed(6);
const encode = [
  "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "16", "-threads", "3", "-r", "30",
  "-profile:v", "high", "-level:v", "4.0", "-pix_fmt", "yuv420p", "-video_track_timescale", "15360",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv",
  "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",
];

function run(args) {
  execFileSync(ffmpeg, ["-hide_banner", "-nostdin", "-y", "-v", "error", "-xerror", ...args], { stdio: "inherit" });
}

function video(file, frame) {
  return ["-ss", seconds(Math.max(0, frame - 0.001)), "-threads", "2", "-i", file];
}

function image(file) {
  return ["-framerate", "30", "-i", file];
}

function probe(file) {
  return JSON.parse(execFileSync("ffprobe", ["-v", "error", "-show_entries",
    "stream=codec_type,nb_frames,start_time,duration,width,height", "-of", "json", file], { encoding: "utf8" })).streams;
}

async function verifyInput(file, expected) {
  const hash = createHash("sha256");
  for await (const bytes of createReadStream(file)) hash.update(bytes);
  if (hash.digest("hex") !== expected) throw new Error(`Unexpected source bytes in ${file}`);
}

function artwork(content, w = width, h = height) {
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${content}</svg>`));
}

const bloom = '<defs><filter id="bloom" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>';
const clamp = value => Math.min(1, Math.max(0, value));
const opacity = (alpha, content) => `<g opacity="${clamp(alpha)}">${content}</g>`;

function ease(value) {
  const phase = clamp(value);
  return phase ** 2 * (3 - 2 * phase);
}

async function writeFrames(work, name, count, draw) {
  const pattern = join(work, `${name}-%03d.png`);
  for (let frame = 0; frame < count; frame++) {
    await artwork(draw(frame)).png().toFile(pattern.replace("%03d", String(frame).padStart(3, "0")));
  }
  return pattern;
}

function still(file, frame, output) {
  run([...video(file, frame), "-frames:v", "1", "-vf", "scale=in_color_matrix=bt709:out_range=pc,format=rgb24",
    "-update", "1", output]);
}

function bridgeGap(left, right, frames, output) {
  run([
    ...video(archive, left), ...video(archive, right), "-filter_complex_threads", "2", "-filter_complex", [
      `[0:v]trim=end_frame=1,tpad=stop_mode=clone:stop=${frames},${clock}[outgoing]`,
      `[1:v]trim=end_frame=1,tpad=stop_mode=clone:stop=${frames},${clock}[incoming]`,
      `[outgoing][incoming]xfade=transition=fade:offset=0:duration=${seconds(frames)},format=yuv420p,${rec709}[out]`,
    ].join(";"), "-map", "[out]", "-frames:v", String(frames), ...encode, output,
  ]);
}

async function renderHike(work, contour, file) {
  const frames = hike.end - hike.start;
  const freeze = join(work, "mountain.png");
  const blurred = join(work, "mountain-soft.png");
  still(archive, hike.clear, freeze);
  await sharp(freeze).blur(16).modulate({ brightness: 0.73, saturation: 0.94 }).png().toFile(blurred);

  const mask = await writeFrames(work, "hike-mask", frames, frame => {
    const open = ease(frame / 25);
    const expand = ease((frame - 53) / 21);
    const w = (416 + 548 * open) * (1 - expand) + width * expand;
    const h = (700 + 148 * open) * (1 - expand) + height * expand;
    const radius = (62 + 22 * open) * (1 - expand);
    return `<rect width="${width}" height="${height}" fill="#000"/>
      <rect x="${(width - w) / 2}" y="${(height - h) / 2}" width="${w}" height="${h}" rx="${radius}" fill="#fff"/>`;
  });
  const year = titlePaths("2025", { top: 602, height: 28, spacing: 14, fill: gold });
  const type = await writeFrames(work, "hike-title", frames, frame =>
    bloom + opacity((68 - frame) / 12,
      typeOnHeadline("M7 HIKE", frame, 12, 478, 70) + opacity((frame - 22) / 8, year)));

  // Finish the gallery's authored slide, then open the center card into its
  // next clean source frame while the lettering clears.
  const progress = "clip((N-54)/17,0,1)";
  run([
    ...video(archive, hike.start - 1), ...image(contour), ...image(blurred), ...image(freeze), ...image(mask), ...image(type),
    "-filter_complex_threads", "2", "-filter_complex", [
      `[0:v]trim=end_frame=1,tpad=stop_mode=clone:stop=9,${clock},${rec709},format=yuv444p[previous]`,
      `[1:v]format=rgba,tpad=stop_mode=clone:stop=${frames - 1}[plate]`,
      `[2:v]format=gbrp,tpad=stop_mode=clone:stop=${frames - 1}[soft]`,
      `[3:v]format=gbrp,tpad=stop_mode=clone:stop=${frames - 1}[clear]`,
      `[soft][clear]blend=all_expr='A*(1-${progress})+B*${progress}',format=rgba[mountain]`,
      "[4:v]format=gray[mask]",
      "[mountain][mask]alphamerge[card]",
      "[plate][card]overlay=format=auto:shortest=1[framed]",
      "[framed][5:v]overlay=format=auto:shortest=1,scale=out_color_matrix=bt709:out_range=tv,format=yuv444p,setsar=1,"
        + `${clock}[hike]`,
      `[previous][hike]xfade=transition=fade:offset=0:duration=0.266667,format=yuv420p,${rec709}[out]`,
    ].join(";"), "-map", "[out]", "-frames:v", String(frames), ...encode, file,
  ]);
}

async function renderWudu(work, contour, output) {
  const frames = thankYouStart - wuduStart;
  const label = join(work, "community-promise.png");
  const clear = join(work, "wudu-transition.png");
  await artwork(titlePaths("YOUR SUPPORT TURNED A VISION INTO SOMETHING REAL.", {
    top: 8, height: 32, maxWidth: 1580, spacing: 8, fill: gold,
  }), width, 62).png().toFile(label);
  const shade = await artwork(`<defs><radialGradient id="light" cx="50%" cy="43%" r="62%">
      <stop stop-color="#ac8247" stop-opacity=".18"/><stop offset="1" stop-color="#080906" stop-opacity="0"/>
    </radialGradient></defs><rect width="1920" height="1080" fill="#090b09" opacity=".23"/>
    <rect width="1920" height="1080" fill="url(#light)"/>`).png().toBuffer();
  await sharp(contour).composite([{ input: shade }]).png().toFile(clear);
  const start = 5220 - wuduStart;
  const end = 5351 - wuduStart;
  // Cover the baked double exposure where the two facility shots trade places.
  const coverIn = 5559 - wuduStart;
  const coverOut = 5576 - wuduStart;
  run([
    ...video(previous, wuduStart), ...image(label), ...image(clear), "-filter_complex_threads", "2", "-filter_complex", [
      `[1:v]format=rgba,tpad=stop_mode=clone:stop=${frames},fade=t=in:s=${start}:n=10:alpha=1,fade=t=out:s=${end}:n=10:alpha=1[caption]`,
      `[2:v]format=rgba,tpad=stop_mode=clone:stop=${frames},fade=t=in:s=${coverIn}:n=8:alpha=1,fade=t=out:s=${coverOut}:n=9:alpha=1[clear]`,
      "[0:v][clear]overlay=format=yuv420[panels]",
      "[panels][caption]overlay=x=0:y=1009:format=yuv420[out]",
    ].join(";"), "-map", "[out]", "-frames:v", String(frames), ...encode, output,
  ]);
}

async function renderClosing(work, contour, output) {
  const frames = total - thankYouStart;
  const sealOffset = sealStart - thankYouStart;
  const sealFrames = total - sealStart;
  const lead = seal.hold - seal.start;
  const tail = seal.end - seal.hold;
  const hold = sealFrames - lead - tail;
  const clear = `fade=t=out:s=${sealOffset - 17}:n=12:alpha=1`;
  const logoFrame = join(work, "original-lockup.png");
  const emblem = join(work, "welcome-emblem.png");
  const backdrop = join(work, "welcome-contours.png");
  still(archive, 5229, logoFrame);

  const crop = { left: 743, top: 111, width: 462, height: 586 };
  const alpha = await sharp(logoFrame).extract(crop).greyscale().raw().toBuffer();
  const ink = await sharp({ create: { width: crop.width, height: crop.height, channels: 3, background: "#fffaf0" } })
    .joinChannel(alpha, { raw: { width: crop.width, height: crop.height, channels: 1 } }).png().toBuffer();
  await sharp(ink).resize({ height: 205 }).png().toFile(emblem);
  const shade = await artwork('<rect width="1920" height="1080" fill="#090b09" opacity=".34"/>').png().toBuffer();
  await sharp(contour).composite([{ input: shade }]).png().toFile(backdrop);

  const greeting = titlePaths("JAZAKUM ALLAHU KHAYRAN", { top: 172, height: 35, spacing: 10, fill: gold });
  const pledge = titlePaths("EVERY CONTRIBUTION BECAME SOMETHING REAL.", {
    top: 739, height: 30, maxWidth: 1270, spacing: 10, fill: gold,
  });
  const welcome = await writeFrames(work, "welcome-title", 69, frame => bloom
    + opacity((frame - 12) / 10, greeting)
    + typeOnHeadline("WELCOME TO HAZRAT BILAL", frame, 23, 492, 67, 14, 40)
    + typeOnHeadline("ISLAMIC CENTRE", frame, 39, 594, 64, 11)
    + opacity((frame - 55) / 10, `<path d="M895 706h130" stroke="${gold}" stroke-width="2"/>${pledge}`));

  const address = "HBIC.CA/DONATE";
  const linkStart = 80;
  const link = await writeFrames(work, "donation-link", 100, frame =>
    titlePaths(address, { top: 963, height: 30, spacing: 10, fill: gold,
      visible: Math.max(0, Math.ceil((frame - linkStart + 1) * address.length / 13)),
      caret: frame >= linkStart && frame < linkStart + 18 }));

  run([
    ...video(previous, thankYouStart), ...image(backdrop), ...image(emblem), ...image(welcome),
    ...video(archive, seal.start), ...image(link), "-filter_complex_threads", "2", "-filter_complex", [
      `[1:v]format=rgba,tpad=stop_mode=clone:stop=${frames}[plate]`,
      `[2:v]format=rgba,tpad=stop_mode=clone:stop=${frames},fade=t=in:s=8:n=12:alpha=1,${clear}[emblem]`,
      "[plate][emblem]overlay=x='(W-w)/2':y=248:format=auto:shortest=1[mark]",
      `[3:v]format=rgba,tpad=stop_mode=clone:stop=${frames},${clear}[text]`,
      `[mark][text]overlay=format=auto:shortest=1,format=yuva420p,fade=t=in:s=0:n=12:alpha=1[welcome]`,
      "[0:v][welcome]overlay=format=yuv420:shortest=1[thanks]",
      `[4:v]${rec709},split=2[sealStart][sealEnd]`,
      `[sealStart]trim=end_frame=${lead},tpad=stop_mode=clone:stop=${hold},${clock}[rise]`,
      `[sealEnd]trim=start_frame=${lead}:end_frame=${lead + tail},${clock}[fade]`,
      `[rise][fade]concat=n=2:v=1:a=0,${clock}[seal]`,
      `[5:v]format=rgba,tpad=stop_mode=clone:stop=${sealFrames},fade=t=out:s=${sealFrames - tail + 7}:n=12:alpha=1[url]`,
      `[seal][url]overlay=format=auto:shortest=1,format=yuva420p,fade=t=in:s=0:n=10:alpha=1,settb=1/30,setpts=N+${sealOffset}[closing]`,
      "[thanks][closing]overlay=eof_action=pass:format=yuv420[out]",
    ].join(";"), "-map", "[out]", "-frames:v", String(frames), ...encode, output,
  ]);
}

await Promise.all([
  verifyInput(archive, sources.archive),
  verifyInput(previous, "b12cee820f41d29a7b22f4d076b2196d550e4fea93bf75ffeca64bc194635d0c"),
]);
await mkdir(destination, { recursive: true });
const work = await mkdtemp(join(destination, ".full-style-"));
try {
  const contour = join(work, "archive-contours.png");
  still(archive, 1323, contour);
  const parts = [];
  let position = 0;
  async function section(name, end, edit) {
    const file = `${String(parts.length).padStart(2, "0")}-${name}.mp4`;
    const path = join(work, file);
    const frames = end - position;
    await edit(path, frames);
    if (Number(probe(path)[0]?.nb_frames) !== frames) throw new Error(`Unexpected frame count for ${name}.`);
    parts.push(`file '${file}'\nduration ${seconds(frames)}\n`);
    position = end;
    console.log(`Checked ${name} through ${seconds(end)} s.`);
  }
  const straight = (file, start) => (out, frames) =>
    run([...video(file, start), "-map", "0:v:0", "-vf", rec709, "-frames:v", String(frames), ...encode, out]);

  for (const [i, [start, end]] of blackGaps.entries()) {
    await section(`archive-${i + 1}`, start, straight(archive, position));
    await section(`join-${i + 1}`, end, (out, frames) => bridgeGap(start - 1, end, frames, out));
  }
  await section("archive-galleries", brothersEntrance, straight(archive, position));
  await section("brothers-night-entrance", brothersTitle, (out, frames) => {
    // The rendered chapter is opaque contour artwork at this frame. Replace
    // the earlier inset beneath its fade with the native moving camera shot.
    run([
      ...video(archive, brothersEntrance), ...video(previous, brothersTitle),
      "-filter_complex_threads", "2", "-filter_complex", [
        `[0:v]trim=end_frame=${frames},${clock},${rec709}[greeting]`,
        `[1:v]trim=end_frame=1,tpad=stop_mode=clone:stop=${frames},${clock}[contours]`,
        `[greeting][contours]xfade=transition=fade:offset=0:duration=${seconds(frames)},format=yuv420p,${rec709}[out]`,
      ].join(";"), "-map", "[out]", "-frames:v", String(frames), ...encode, out,
    ]);
  });
  await section("brothers-night", brothersReturn, straight(previous, position));
  await section("outdoor-gallery", hike.start + insertLength, straight(archive, position - insertLength));
  await section("m7-hike", hike.end + insertLength, out => renderHike(work, contour, out));
  await section("archive-trail-and-academy", wuduStart, straight(archive, position - insertLength));
  await section("wudu-project", thankYouStart, out => renderWudu(work, contour, out));
  await section("welcome-and-donation", total, out => renderClosing(work, contour, out));

  const list = join(work, "film.ffconcat");
  const temp = join(work, "review.mp4");
  await writeFile(list, `ffconcat version 1.0\n${parts.join("")}`);
  run([
    "-f", "concat", "-safe", "0", "-i", list, "-i", previous, "-map", "0:v:0", "-map", "1:a:0",
    "-map_metadata", "1", "-c", "copy", "-video_track_timescale", "15360", "-movflags", "+faststart+write_colr", temp,
  ]);
  const streams = probe(temp);
  const [picture, sound] = streams;
  if (streams.length !== 2 || Number(picture?.nb_frames) !== total || Number(sound?.nb_frames) !== 9700
      || streams.some(stream => stream.start_time !== "0.000000" || stream.duration !== seconds(total))) {
    throw new Error("The archive comparison changed the picture or audio timing.");
  }
  const output = join(destination, "Masjid Bilal Trailer - Original Style Review.mp4");
  await chmod(temp, 0o600);
  await rename(temp, output);
  console.log(output);
} finally {
  await rm(work, { recursive: true, force: true });
}
