import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";
import { filmEnd, sources, timeline } from "./community-film-timeline.mjs";
import { renderHbicTrailerCovers } from "./render-hbic-youtube-thumbnail.mjs";

const [archive, sound, cameraDirectory, destination] = process.argv.slice(2).map(arg => resolve(arg));
if (!destination) {
  throw new Error("Usage: render-hbic-community-trailer.mjs <archive film> <November 20 master> <camera originals> <output directory>");
}

const work = join(destination, "render");
await mkdir(work, { recursive: true });
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const font = process.env.HBIC_FILM_FONT || "/System/Library/Fonts/Avenir Next.ttc";
const width = 1920;
const height = 1080;
const fps = 30;
const toFrames = value => Math.round(value * fps);
const dissolveFrames = 12;
const radius = 28;
const ink = "#0b131c";
const ivory = "#faf7ef";
const gold = "#dfc39a";
const silver = "#d5dbe1";
const filmMetadata = [
  "-metadata", "title=Masjid Bilal — Our Community",
  "-metadata", "comment=HBIC community footage. Nasheed: Hona Marro — Mubarak al Nwaibet.",
];
const rec709 = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-color_range", "tv"];
const h264Color = "h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0";

const files = { archive, sound };
for (const id of Object.keys(sources)) files[id] ??= join(cameraDirectory, id);
for (const [id, path] of Object.entries(files)) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  if (hash.digest("hex") !== sources[id]) throw new Error(`Source SHA-256 mismatch for ${id}`);
}

const slots = {
  wide: [[80, 45, 1760, 990]],
  editorial: [[1128, 85, 512, 910]],
  "landscape-pair": [[118, 300, 824, 466], [978, 300, 824, 466]],
  gallery: [[176, 259, 500, 720], [710, 259, 500, 720], [1244, 259, 500, 720]],
  "academy-pair": [[426, 257, 518, 722], [976, 257, 518, 722]],
  compare: [[454, 288, 490, 646], [976, 288, 490, 646]],
  quote: [],
  closing: [],
};

const videoSettings = [
  "-c:v", "libx264", "-preset", "fast", "-threads", "3", "-pix_fmt", "yuv420p", "-r", "30",
  ...rec709, "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709",
  "-video_track_timescale", "15360", "-map_metadata", "-1",
];

function render(args) {
  return new Promise((resolve, reject) => {
    const job = spawn(ffmpeg, ["-hide_banner", "-nostdin", "-y", "-v", "error", ...args], { stdio: "inherit" });
    job.once("error", reject);
    job.once("close", (code, signal) => code === 0 ? resolve() : reject(new Error(`FFmpeg failed (${code ?? signal})`)));
  });
}

function svg(contents, w = width, h = height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${contents}</svg>`);
}

function transparent() {
  return sharp({ create: { width, height, channels: 4, background: "#00000000" } });
}

const encodeText = value => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

async function typeset(text, x, y, { size, color = ivory, align = "center", weight = "Demi Bold", max = 1550, track = 0 }) {
  const input = await sharp({ text: {
    text: `<span foreground="${color}" letter_spacing="${track * 1024}">${encodeText(text)}</span>`,
    font: `Avenir Next ${weight} ${size}`, fontfile: font, dpi: 72, rgba: true,
  } }).png().toBuffer();
  const bounds = await sharp(input).metadata();
  if (bounds.width > max) throw new Error(`Film title is wider than its layout: ${text} (${bounds.width} > ${max})`);
  return { input, left: Math.round(x - (align === "center" ? bounds.width / 2 : 0)), top: y };
}

function matte(scene, rectangles) {
  const shade = scene.layout === "quote" || scene.layout === "closing" ? "#283b50" : "#233548";
  return svg(`<defs>
    <linearGradient id="base" x2="0.88" y2="1"><stop stop-color="#121f2c"/><stop offset=".58" stop-color="${ink}"/><stop offset="1" stop-color="#080d13"/></linearGradient>
    <radialGradient id="light" cx=".34" cy=".22" r=".8"><stop stop-color="${shade}" stop-opacity=".74"/><stop offset="1" stop-color="${shade}" stop-opacity="0"/></radialGradient>
    <linearGradient id="rim" x2=".77" y2="1"><stop stop-color="#e0d5c2" stop-opacity=".52"/><stop offset=".45" stop-color="#95aabb" stop-opacity=".23"/><stop offset="1" stop-color="#95aabb" stop-opacity=".11"/></linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#base)"/>
  <rect width="1920" height="1080" fill="url(#light)"/>
  ${rectangles.map(([x,y,w,h]) => `
    <rect x="${x - 5}" y="${y + 5}" width="${w + 10}" height="${h + 8}" rx="${radius + 4}" fill="#030609" fill-opacity=".58"/>
    <rect x="${x - 2}" y="${y - 2}" width="${w + 4}" height="${h + 4}" rx="${radius + 2}" fill="#090e13" stroke="url(#rim)" stroke-width="2"/>`).join("")}`);
}

const masks = new Map();
async function mask(w, h) {
  const key = `${w}x${h}`;
  if (!masks.has(key)) {
    const path = join(work, `mask-${key}.png`);
    await sharp(svg(`<rect width="${w}" height="${h}" rx="${radius}" fill="white"/>`, w, h))
      .flatten({ background: "#000" }).png().toFile(path);
    masks.set(key, path);
  }
  return masks.get(key);
}

async function originalMark() {
  const grab = join(work, "archival-wordmark.png");
  await render(["-ss", "174.30", "-i", files.archive, "-frames:v", "1", grab]);
  const logoWidth = 440;
  const logoHeight = 570;
  const alpha = await sharp(grab).extract({ left: 755, top: 119, width: logoWidth, height: logoHeight })
    .greyscale().raw().toBuffer();
  const rgba = await sharp({ create: { width: logoWidth, height: logoHeight, channels: 3, background: ivory } })
    .joinChannel(alpha, { raw: { width: logoWidth, height: logoHeight, channels: 1 } })
    .png().toBuffer();
  return sharp(rgba).resize({ height: 222 }).png().toBuffer();
}

const mark = await originalMark();
const markBounds = await sharp(mark).metadata();

async function captions(scene, seconds, outgoingDissolve) {
  const groups = [];
  const title = (text, x, y, size, extra = {}) => typeset(text, x, y, { size, ...extra });
  const small = (text, x, y, extra = {}) => title(text, x, y, 34, { color: gold, track: 3, ...extra });
  const sub = (text, x, y, extra = {}) => title(text, x, y, 44, { color: silver, weight: "Medium", ...extra });
  const stop = seconds - (outgoingDissolve ? 0.10 : 0.02);
  const group = (layers, start = 0.11, end = stop, extras = {}) => groups.push({ layers, start, end, ...extras });

  switch (scene.layout) {
    case "quote":
      for (const line of scene.lines) {
        group([await title(line.text, 960, line.y, line.size, { color: line.accent ? gold : ivory })], line.at);
      }
      break;
    case "wide":
      if (!scene.title) break;
      group([{
        input: svg(`<defs><linearGradient id="scrim" x2="0" y2="1"><stop stop-color="#080e16" stop-opacity="0"/><stop offset=".47" stop-color="#080e16" stop-opacity=".4"/><stop offset="1" stop-color="#080e16" stop-opacity=".8"/></linearGradient><clipPath id="window"><rect x="80" y="45" width="1760" height="990" rx="${radius}"/></clipPath></defs><rect x="80" y="411" width="1760" height="624" fill="url(#scrim)" clip-path="url(#window)"/>`),
        left: 0, top: 0,
      }], 0, scene.endTitle ?? stop, { travel: 0 });
      group([
        ...(scene.kicker ? [await small(scene.kicker, 960, scene.opening ? 651 : 706)] : []),
        await title(scene.title, 960, scene.opening ? 715 : 768, scene.opening ? 131 : 103),
      ], scene.opening ? 0.13 : 0.21, scene.endTitle ?? stop);
      break;
    case "editorial": {
      const aligned = { align: "left", max: 870 };
      const heading = [
        ...(scene.kicker ? [await small(scene.kicker, 186, 296, aligned)] : []),
        ...await Promise.all(scene.title.map((line, index) => title(line, 180, 373 + 113 * index, 108, aligned))),
      ];
      group(heading, 0.13, stop, { fixed: scene.fixedTitle });
      if (scene.detail) group([await sub(scene.detail, 186, 669, aligned)], 0.17);
      break;
    }
    case "compare":
      group([
        await small(scene.kicker, 960, 74),
        await title(scene.title, 960, 128, 77),
        await small("BEFORE", 699, 230),
        await small("COMPLETED", 1221, 230),
        await sub(scene.detail, 960, 974),
      ]);
      break;
    case "closing":
      group([{ input: mark, left: Math.round((width-markBounds.width)/2), top: 206 }], 0, stop, { fixed: true });
      group([
        await small(scene.kicker, 960, 485),
        await title(scene.title, 960, 559, 100),
        await sub(scene.detail, 960, 710, { color: scene.continued ? gold : silver, size: 51 }),
      ], 0.15, scene.continued ? seconds + 1 : seconds - 0.1);
      break;
    default:
      group([await title(scene.title, 960, scene.layout === "landscape-pair" ? 150 : 105, 98)]);
  }
  return groups;
}

function sceneInfo(scene, index) {
  const next = timeline[index + 1];
  const frames = toFrames(next?.at ?? filmEnd) - toFrames(scene.at);
  const head = scene.dissolve ? dissolveFrames / 2 : 0;
  const tail = next?.dissolve ? dissolveFrames / 2 : 0;
  if (frames < dissolveFrames || (scene.media?.length ?? 0) !== slots[scene.layout]?.length) {
    throw new Error(`Invalid layout or timing in ${scene.id}`);
  }
  return { ...scene, frames, head, tail };
}

async function renderScene(scene) {
  const { frames, head, tail, id } = scene;
  const rectangles = slots[scene.layout];
  const groups = await captions(scene, frames / fps, tail > 0);
  const base = join(work, `${id}-plate.png`);
  const fixed = groups.filter(group => group.fixed).flatMap(group => group.layers);
  await sharp(matte(scene, rectangles)).composite(fixed).flatten({ background: ink }).png().toFile(base);
  const input = [];
  let inputCount = 0;
  function still(path) {
    input.push("-loop", "1", "-framerate", String(fps), "-i", path);
    return inputCount++;
  }
  still(base);
  const graph = [`[0:v]format=rgba,trim=end_frame=${frames}[plate]`];
  let previous = "plate";
  for (const [index, media] of (scene.media ?? []).entries()) {
    const [x,y,w,h] = rectangles[index];
    const moving = inputCount++;
    input.push("-ss", media.from.toFixed(6), "-threads", "2", "-i", files[media.source]);
    const matteInput = still(await mask(w, h));
    const sourceFrames = toFrames(media.to - media.from);
    const transfer = media.source === "archive" ? [] : [
      "zscale=t=linear:npl=132", "format=gbrpf32le", "tonemap=tonemap=mobius:param=0.26:desat=2",
      "zscale=p=bt709:t=bt709:m=bt709:r=limited", "eq=brightness=-0.024:contrast=0.98:saturation=0.92",
    ];
    const crop = media.crop ? [`crop=${media.crop.join(":")}`] : [];
    const prepared = [
      "fps=30", `trim=end_frame=${sourceFrames}`, `setpts=(PTS-STARTPTS)*${frames}/${sourceFrames}`,
      "fps=30", "tpad=stop_mode=clone:stop=2", ...transfer, ...crop,
      `scale=${w}:${h}:force_original_aspect_ratio=increase:flags=lanczos`, `crop=${w}:${h}`,
      "setsar=1", "format=rgba",
    ].join(",");
    graph.push(`[${moving}:v]${prepared}[footage${index}]`);
    graph.push(`[${matteInput}:v]format=gray[mask${index}]`);
    graph.push(`[footage${index}][mask${index}]alphamerge[image${index}]`);
    graph.push(`[${previous}][image${index}]overlay=x=${x}:y=${y}:format=auto:shortest=1[picture${index}]`);
    previous = `picture${index}`;
  }

  for (const [index, group] of groups.filter(group => !group.fixed).entries()) {
    const { layers, start, end, travel = 14 } = group;
    const overlay = join(work, `${id}-title-${index}.png`);
    await transparent().composite(layers).png().toFile(overlay);
    const graphic = still(overlay);
    const exit = end < frames / fps ? `,fade=t=out:st=${Math.max(start + 0.38, end - 0.28)}:d=0.28:alpha=1` : "";
    graph.push(`[${graphic}:v]format=rgba,fade=t=in:st=${start}:d=0.4:alpha=1${exit}[type${index}]`);
    const ease = `${travel}*pow(1-clip((t-${start})/0.52,0,1),3)`;
    graph.push(`[${previous}][type${index}]overlay=y='${ease}':format=auto:shortest=1[written${index}]`);
    previous = `written${index}`;
  }

  const tailFade = id === "support" ? `,fade=t=out:st=${frames / fps - 0.72}:d=0.72:color=0x080d13` : "";
  graph.push(`[${previous}]trim=end_frame=${frames}${tailFade},format=yuv420p,setsar=1,tpad=start_mode=clone:start=${head}:stop_mode=clone:stop=${tail}[scene]`);
  const path = join(work, `${id}.mp4`);
  console.log(`Rendering ${scene.at.toFixed(2)}s · ${id} · ${frames} frames`);
  await render([...input, "-filter_complex_threads", "2", "-filter_complex", graph.join(";"),
    "-map", "[scene]", "-an", "-frames:v", String(frames + head + tail), ...videoSettings, "-crf", "14", path]);
  return { ...scene, path };
}

async function assemble(scenes) {
  const groups = [];
  for (const scene of scenes) {
    if (scene.head) groups.at(-1).push(scene);
    else groups.push([scene]);
  }
  const sections = [];
  for (const [index, group] of groups.entries()) {
    if (group.length === 1) {
      sections.push(group[0].path);
      continue;
    }
    const graph = group.map((_, i) => `[${i}:v]format=yuv444p,settb=1/30,setpts=N[part${i}]`);
    let prior = "part0";
    let offset = 0;
    for (let i = 1; i < group.length; i++) {
      offset += group[i - 1].frames;
      const current = `join${i}`;
      const mix = "P*P*(3-2*P)";
      graph.push(`[${prior}][part${i}]xfade=transition=custom:expr='${mix}*A+(1-${mix})*B':duration=${dissolveFrames/fps}:offset=${(offset-dissolveFrames/2)/fps}[${current}]`);
      prior = current;
    }
    graph.push(`[${prior}]trim=end_frame=${group.reduce((sum, scene) => sum + scene.frames, 0)},format=yuv420p[section]`);
    const section = join(work, `section-${index}.mp4`);
    await render([...group.flatMap(scene => ["-threads", "2", "-i", scene.path]), "-filter_complex_threads", "2",
      "-filter_complex", graph.join(";"), "-map", "[section]", "-an", ...videoSettings, "-crf", "15", section]);
    sections.push(section);
  }
  return sections;
}

async function renderPreviewAssets(master) {
  await renderHbicTrailerCovers(master, destination, ffmpeg);
  // Match the film's dissolves in the silent preview. Keep every preview shot
  // free of film titles so it reads clearly under the website's play control.
  const tease = [26.1, 60.5, 82.7, 125.85];
  const previewGraph = tease.map((_, i) =>
    `[${i}:v]scale=960:540:flags=lanczos,fps=24,trim=end_frame=54,format=yuv444p,settb=1/24,setpts=N[tease${i}]`);
  for (let i = 1; i < tease.length; i++) {
    previewGraph.push(`[${i === 1 ? "tease0" : `mix${i - 1}`}][tease${i}]xfade=transition=fade:duration=${8/24}:offset=${(46*i)/24}[mix${i}]`);
  }
  previewGraph.push("[mix3]format=yuv420p,fade=t=in:d=0.20,fade=t=out:st=7.7:d=0.3[v]");
  await render([...tease.flatMap(from => ["-ss", String(from), "-t", "2.25", "-i", master]), "-filter_complex_threads", "2",
    "-filter_complex", previewGraph.join(";"), "-map", "[v]", "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "25",
    "-maxrate", "640k", "-bufsize", "1250k", "-movflags", "+faststart", join(destination, "teaser.mp4")]);
}

const selected = process.env.HBIC_FILM_PROOF?.split(",");
const edits = timeline.map(sceneInfo);
const master = join(destination, "Masjid Bilal Community Film.mp4");
if (process.env.HBIC_FILM_PREVIEWS_ONLY === "1") {
  await renderPreviewAssets(master);
} else if (selected) {
  for (const scene of edits.filter(scene => selected.includes(scene.id))) await renderScene(scene);
} else {
  const shots = [];
  for (const scene of edits) shots.push(await renderScene(scene));
  const sections = await assemble(shots);
  const concat = join(work, "timeline.ffconcat");
  await writeFile(concat, "ffconcat version 1.0\n" + sections.map(path => `file '${path.replaceAll("'", "'\\''")}'\n`).join(""));
  await render(["-f", "concat", "-safe", "0", "-i", concat, "-i", files.sound, "-map", "0:v:0", "-map", "1:a:0",
    "-c", "copy", "-bsf:v", h264Color, ...rec709, "-map_metadata", "-1", "-video_track_timescale", "15360",
    "-movflags", "+faststart+write_colr", ...filmMetadata, master]);
  await render(["-i", master, ...videoSettings, "-crf", "20", "-maxrate", "3000k", "-bufsize", "6000k",
    "-profile:v", "high", "-level:v", "4.1", "-c:a", "copy", "-movflags", "+faststart+write_colr", ...filmMetadata, join(destination, "web-film.mp4")]);
  await renderPreviewAssets(master);
  await writeFile(join(destination, "edit-manifest.json"), JSON.stringify({ fps, duration: filmEnd, dissolveFrames, sources, edits }, null, 2) + "\n");
}
