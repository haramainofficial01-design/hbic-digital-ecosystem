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
const longestDissolve = 12;
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
const closingSource = { start: 5160, hold: 5294, end: 5316 };
const donationUrl = "HBIC.CA/DONATE";
const scenes = [
  { at: 5170, id: "before-and-after", transition: 12, title: "FROM THE BEGINNING",
    entrance: "sides", labels: ["BEFORE", "COMPLETED"],
    media: [
      { from: 150.92, to: 153.38, crop: originalRoom, speed: 0.65 },
      { from: 166.35, to: cleanSeatEnd, crop: facilities, speed: 0.78, warm: true },
    ] },
  { at: 5370, id: "wudu-area", transition: 10, title: "OUR WUDU AREA",
    entrance: "rise", caption: "A SPACE OF DIGNITY",
    media: [
      { from: 157.43, to: 158.00, crop: facilities, speed: 0.68, warm: true },
      { from: 160.35, to: 163.54, crop: facilities, speed: 0.60, warm: true },
    ] },
  { at: 5571, id: "community-support", transition: 8, title: "WITH YOUR SUPPORT", caption: "100% COMMUNITY POWERED",
    media: [
      { from: 164.08, to: 165.83, crop: facilities, speed: 0.61, warm: true },
      { from: 166.24, to: cleanSeatEnd, crop: facilities, speed: 0.76, warm: true },
    ] },
  { at: 5787, id: "thank-you", transition: 12, shade: ".45" },
  { at: 5961, id: "closing", transition: 12, shade: ".64" },
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

function svg(content, w = width, h = height, top = 0) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 ${top} ${w} ${h}">${content}</svg>`);
}

function headline(text, frame, start, top, capHeight, length = 11, caretThrough = start + length + 6) {
  if (frame < start) return "";
  // Match the short opening reveal and its brief caret hold. Keep the
  // complete line's width as the anchor while the letters appear.
  const letters = text.replaceAll(" ", "").length;
  const elapsed = frame - start;
  const visible = Math.ceil((elapsed + 1) * letters / length);
  const caret = frame < caretThrough;
  const core = titlePaths(text, { top, height: capHeight, maxWidth: 1450, visible, caret });
  return `<g opacity=".48" filter="url(#bloom)" transform="translate(0 2)">${core}</g>${core}`;
}

async function archiveInk(frame, crop, height) {
  // The artwork is white on pure black. Luminance retains the actual anti-aliased edges.
  const { width: w, height: h } = crop;
  const alpha = await sharp(frame).extract(crop).removeAlpha().greyscale().raw().toBuffer();
  const rgba = await sharp({ create: { width: w, height: h, channels: 3, background: "#fffaf0" } })
    .joinChannel(alpha, { raw: { width: w, height: h, channels: 1 } })
    .png().toBuffer();
  return sharp(rgba).resize({ height }).png().toBuffer();
}

function panelRim(w, h) {
  return svg(`<defs><linearGradient id="rim" x2="1" y2="1"><stop stop-color="#e9d6a6" stop-opacity=".78"/><stop offset="1" stop-color="#e1c186" stop-opacity=".3"/></linearGradient></defs>
    <rect x="2" y="3" width="${w + 12}" height="${h + 13}" rx="41" fill="#000" opacity=".54"/>
    <rect x="6" y="1" width="${w + 4}" height="${h + 4}" rx="38" fill="#101210" stroke="url(#rim)" stroke-width="2"/>`, w + 16, h + 18);
}

async function scenePlate(scene, contour, path) {
  const shade = scene.shade ?? ".23";
  const backing = svg(`<defs>
    <radialGradient id="light" cx="50%" cy="43%" r="62%"><stop stop-color="#ac8247" stop-opacity=".18"/><stop offset="1" stop-color="#080906" stop-opacity="0"/></radialGradient>
    </defs><rect width="1920" height="1080" fill="#090b09" opacity="${shade}"/>
    <rect width="1920" height="1080" fill="url(#light)"/>`);
  await sharp(contour).composite([{ input: backing }]).png().toFile(path);
}

function loop(path) {
  return ["-loop", "1", "-framerate", "30", "-i", path];
}

const clamp = value => Math.max(0, Math.min(1, value));
const settle = (start, duration) => `pow(1-clip((n-1-${start})/${duration},0,1),3)`;
const fadeIn = (content, frame, start) => `<g opacity="${clamp((frame - start) / 8)}">${content}</g>`;
const rule = (y, left, right, fill = gold) => `<path d="M${left} ${y}H${right}" stroke="${fill}" stroke-width="2" opacity=".82"/>`;

async function writeTitleFrames(scene, work) {
  const isClosing = scene.id === "closing";
  const top = scene.media ? 64 : isClosing ? 773 : 406;
  const height = scene.media ? 226 : isClosing ? 154 : 412;
  const start = 12;
  const urlStart = 68;
  const finalFrame = isClosing ? 86 : scene.entrance === "sides" ? 50 : 42;
  const pattern = join(work, `${scene.id}-title-%03d.png`);
  for (let i = 0; i <= finalFrame; i++) {
    let type;
    if (scene.media) {
      type = headline(scene.title, i, start, 93, 80) + fadeIn(rule(211, 902, 1018), i, 23);
      if (scene.labels) {
        type += panels.map(([x, , w], panel) => fadeIn(titlePaths(scene.labels[panel], {
          x: x + w / 2, top: 243, height: 30, maxWidth: w, spacing: 11, fill: gold,
        }), i, 37 + panel * 5)).join("");
      }
      if (scene.caption) {
        type += fadeIn(titlePaths(scene.caption, { top: 242, height: 30, spacing: 11, fill: gold }), i, 29);
      }
    } else if (isClosing) {
      const visible = Math.max(0, Math.ceil((i - urlStart + 1) * donationUrl.length / 12));
      type = fadeIn(rule(804, 899, 1021), i, urlStart - 6);
      type += titlePaths(donationUrl, { top: 855, height: 40, spacing: 10, fill: gold,
        visible, caret: i >= urlStart && i < urlStart + 17 });
    } else {
      type = headline("JAZAKUM ALLAHU", i, start, 438, 82, 11, 24);
      type += headline("KHAYRAN", i, 24, 551, 82, 8);
      type += fadeIn(rule(697, 875, 1045), i, 30);
      type += fadeIn(titlePaths("EVERY CONTRIBUTION BECAME SOMETHING REAL.", {
        top: 751, height: 32, maxWidth: 1530, spacing: 9, fill: gold,
      }), i, 33);
    }
    const letters = svg(`<defs><filter id="bloom" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="7"/></filter></defs>${type}`, width, height, top);
    await sharp(letters).png().toFile(pattern.replace("%03d", String(i).padStart(3, "0")));
  }
  return { pattern, top };
}

function panelPosition(scene, i) {
  const [left, top, w] = panels[i];
  const x = left - 8;
  const y = top - 3;
  if (scene.entrance === "sides") {
    const start = 28 + i * 4;
    const outside = i === 0 ? -w - 24 : width + 24;
    return { x: `${x}+(${outside - x})*${settle(start, 13)}`, y, start };
  }
  if (scene.entrance === "rise") {
    const start = 3 + i * 5;
    return { x, y: `${y}+${height + 24 - y}*${settle(start, 17)}`, start };
  }
  return { x, y, start: 0 };
}

async function renderScene(scene, index, work, contour, assets) {
  const next = scenes[index + 1];
  const frames = (next?.at ?? frameCount) - scene.at + scene.transition / 2 + (next?.transition ?? 0) / 2;
  const plate = join(work, `${scene.id}-back.png`);
  const output = join(work, `${scene.id}.mp4`);
  await scenePlate(scene, contour, plate);
  const title = await writeTitleFrames(scene, work);

  const inputs = [...loop(plate), "-framerate", "30", "-i", title.pattern];
  const graph = ["[0:v]format=rgba[plate]"];
  let under = "plate";
  for (const [i, shot] of (scene.media ?? []).entries()) {
    const [, , w, h] = panels[i];
    const input = 2 + i * 3;
    const { x, y, start } = panelPosition(scene, i);
    inputs.push("-ss", String(shot.from), "-threads", "2", "-i", archive, ...loop(assets.mask), ...loop(assets.rim));
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
      "framerate=fps=30", `tpad=start_mode=clone:start=${start}:stop_mode=clone:stop=${frames}`,
      `zoompan=z='1.005+0.014*(1-cos(PI*on/${frames - 1}))':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=1:s=${w}x${h}:fps=30`,
      "setsar=1", "format=rgba",
    );
    graph.push(
      `[${input}:v]${prepared.join(",")}[moving${i}]`,
      `[${input + 1}:v]format=gray[mask${i}]`,
      `[moving${i}][mask${i}]alphamerge[photo${i}]`,
      `[${input + 2}:v]format=rgba[rim${i}]`,
      `[rim${i}][photo${i}]overlay=x=8:y=3:format=auto:shortest=1[framed${i}]`,
      `[${under}][framed${i}]overlay=x='${x}':y='${y}':format=auto:shortest=1[panel${i}]`,
    );
    under = `panel${i}`;
  }
  const thanksExit = frames - 25;
  if (scene.id === "thank-you") {
    inputs.push(...loop(assets.emblem), ...loop(assets.sweep));
    graph.push(
      "[3:v]format=rgba,fade=t=out:s=4:n=18:alpha=1[sweep]",
      `[${under}][sweep]overlay=x='-460+420*${settle(0, 22)}':y=0:format=auto:shortest=1[lit]`,
      `[2:v]format=rgba,fade=t=in:s=0:n=11:alpha=1,fade=t=out:s=${thanksExit}:n=13:alpha=1[emblem]`,
      `[lit][emblem]overlay=x='(W-w)/2':y='178+52*${settle(1, 11)}':format=auto:shortest=1[thanks]`,
    );
    under = "thanks";
  }
  if (scene.id === "closing") {
    // Reuse the moving seal and actual cursor reveal. Insert a hold before
    // their authored exit so the original soundtrack retains its full tail.
    const lead = closingSource.hold - closingSource.start;
    const sourceFrames = closingSource.end - closingSource.start;
    inputs.push("-ss", seconds(closingSource.start), "-threads", "2", "-i", archive);
    graph.push(
      "[2:v]setpts=PTS-STARTPTS,split=2[markEntry][markExit]",
      `[markEntry]trim=end_frame=${lead},tpad=stop_mode=clone:stop=${frames - sourceFrames}[markHold]`,
      `[markExit]trim=start_frame=${lead}:end_frame=${sourceFrames},setpts=PTS-STARTPTS[markRelease]`,
      "[markHold][markRelease]concat=n=2:v=1:a=0,settb=1/30,setpts=N,scale=1296:730:out_range=pc,setsar=1,format=gray,pad=1920:1080:312:63:color=black[ink]",
      "color=c=0xfffaf1:s=1920x1080:r=30,format=rgba[ivory]",
      "[ivory][ink]alphamerge[archiveSeal]",
      `[${under}][archiveSeal]overlay=x=0:y=0:format=auto:shortest=1[seal]`,
    );
    under = "seal";
  }
  const exitFrame = scene.id === "thank-you" ? thanksExit
    : frames - (next ? 13 : closingSource.end - closingSource.hold);
  const lastFade = next ? "" : `,fade=t=out:s=${frames - 19}:n=18:color=0x151610`;
  graph.push(
    `[1:v]format=rgba,tpad=stop_mode=clone:stop=${frames},fade=t=out:s=${exitFrame}:n=10:alpha=1[type]`,
    `[${under}][type]overlay=x=0:y=${title.top}:format=auto:shortest=1,format=yuv420p${lastFade}[out]`,
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
  const assets = { mask: join(work, "rounded-photo.png"), rim: join(work, "photo-rim.png"),
    emblem: join(work, "thank-you-emblem.png"), sweep: join(work, "closing-light.png") };
  const [, , w, h] = panels[0];
  const emblem = await archiveInk(stillAt(174.3), { left: 743, top: 111, width: 462, height: 586 }, 202);
  await Promise.all([
    sharp(svg(`<rect width="${w}" height="${h}" rx="36" fill="white"/>`, w, h))
      .flatten({ background: "#000" }).png().toFile(assets.mask),
    sharp(panelRim(w, h)).png().toFile(assets.rim),
    writeFile(assets.emblem, emblem),
    sharp(svg(`<defs><linearGradient id="light"><stop stop-color="#ddd2b9" stop-opacity=".22"/><stop offset="1" stop-color="#ddd2b9" stop-opacity="0"/></linearGradient></defs><rect width="460" height="1080" fill="url(#light)"/>`, 460))
      .png().toFile(assets.sweep),
  ]);
  const shots = [];
  for (const [index, scene] of scenes.entries()) {
    shots.push(await renderScene(scene, index, work, contour, assets));
  }

  // Keep the full archived quote. Hold its last clean frame for its dissolve so
  // the outgoing baked-in panel and off-center captions never show through.
  const quoteFrames = lastCleanQuote - tailKeyframe + 1;
  const edit = [
    `[0:v]trim=end_frame=${quoteFrames},tpad=stop_mode=clone:stop=${longestDissolve},settb=1/30,setpts=N[quote]`,
    ...shots.map((_, i) => `[${i + 1}:v]settb=1/30,setpts=N[scene${i}]`),
  ];
  for (const [i, scene] of scenes.entries()) {
    const incoming = i === 0 ? "quote" : `join${i - 1}`;
    const offset = seconds(scene.at - tailKeyframe - scene.transition / 2);
    edit.push(`[${incoming}][scene${i}]xfade=transition=fade:offset=${offset}:duration=${seconds(scene.transition)}[join${i}]`);
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
  const output = join(destination, "Masjid Bilal Trailer - Motion Review.mp4");
  await rename(temp, output);
  console.log(output);
} finally {
  await rm(work, { recursive: true, force: true });
}
