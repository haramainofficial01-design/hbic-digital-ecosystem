import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const [published, originals, graphics, work] = process.argv.slice(2).map(value => resolve(value));
if (!work) throw new Error("Provide the current film, four camera originals directory, prior artwork directory and a fresh output directory.");
mkdirSync(work, { recursive: true });
const dateline = resolve(work, "brothers-date.png");
await sharp({ text: {
  text: '<span foreground="#d4b967">November 2025</span>',
  font: "Montserrat Medium 23",
  fontfile: fileURLToPath(new URL("./fonts/Montserrat-Medium.ttf", import.meta.url)),
  rgba: true,
} }).png().toFile(dateline);

const duration = 206.9;
const fps = 30;
const transition = 0.4;
const half = transition / 2;
const clips = [
  { name: "IMG_0916.MOV", start: 0.15, length: 5.5, sha256: "9afc4cd54b725a0290f18a7b17218cc701b51057bb72bb854b7aa32b6981d840" },
  { name: "IMG_0965.MOV", start: 0.1, length: 3, sha256: "8a12e1c7b20c63bb31e6ea76d957d7b3f121dd4a481532f329f5d5cc86f4d9ab" },
  { name: "IMG_0984.MOV", start: 0.2, length: 7.5, sha256: "25a6fba3a3aa86b312287e8e142b59c2d147e03a59b2e3794f11db397b48f163" },
  { name: "IMG_0987.MOV", start: 0.6, length: 9.5, sha256: "e657d6e505b1cfc53489d5c495b5b04d477040c0a9f6b8b15b0402bef1318482" },
];
const edits = [86, 91.5, 94.5, 102, 111.5];
const encode = [
  "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-threads", "4",
  "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
];

function ffmpeg(args, capture = false) {
  const result = spawnSync(process.env.FFMPEG || "ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], {
    encoding: "utf8",
    maxBuffer: 8_000_000,
    stdio: capture ? "pipe" : ["ignore", "inherit", "inherit"],
  });
  if (result.status !== 0) throw new Error(result.stderr || `FFmpeg failed with status ${result.status}`);
  return result.stderr;
}

function graphic(name) {
  return ["-loop", "1", "-framerate", String(fps), "-i", resolve(graphics, name)];
}

async function verifyInput(source, expected) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(source)) hash.update(chunk);
  if (hash.digest("hex") !== expected) throw new Error(`Unexpected source bytes: ${source}`);
}

async function cameraScene(clip, index) {
  const source = resolve(originals, clip.name);
  await verifyInput(source, clip.sha256);
  const path = resolve(work, `brothers-${index + 1}.mp4`);
  console.log(`Preparing Drive camera original ${clip.name}`);
  const graph = [
    "[0:v]eq=brightness=-0.035:contrast=0.9,format=rgba[background]",
    "[1:v]zscale=t=linear:npl=135,format=gbrpf32le,tonemap=tonemap=mobius:param=0.24:desat=2,zscale=p=bt709:t=bt709:m=bt709:r=limited,scale=456:810:flags=lanczos:force_original_aspect_ratio=increase,crop=456:810,setsar=1,fps=30,format=rgba[camera]",
    "[2:v]scale=456:810:flags=lanczos,format=gray[mask]",
    "[camera][mask]alphamerge[photo]",
    "[3:v]scale=538:890:flags=lanczos,format=rgba[rim]",
    "[background][rim]overlay=691:90:shortest=1[base]",
    "[base][photo]overlay=732:130:shortest=1[framed]",
    "[framed][4:v]overlay=x='(W-w)/2':y=5:shortest=1[headed]",
    "[headed][5:v]overlay=x='(W-w)/2':y=943:shortest=1[captioned]",
    "[captioned][6:v]overlay=x='(W-w)/2':y=1037:shortest=1,format=yuv420p[out]",
  ].join(";");
  ffmpeg([
    "-v", "warning", ...graphic("community-background.png"), "-ss", String(clip.start), "-i", source,
    ...graphic("portrait-mask.png"), ...graphic("portrait-rim.png"), ...graphic("brothers-heading.png"),
    ...graphic(`community-caption-${index + 1}.png`), "-loop", "1", "-framerate", String(fps), "-i", dateline,
    "-filter_complex_threads", "2", "-filter_complex", graph, "-map", "[out]", "-t", String(clip.length),
    ...encode, path,
  ]);
  return path;
}

await verifyInput(published, "cd5f13fb9a6f1e9302ce41a2b46f08c852ff8a59f955d7c9c1bb042669a4a161");
const scenes = [];
for (const [index, clip] of clips.entries()) scenes.push(await cameraScene(clip, index));
const timeline = [
  // Replace the empty framed shot with a dissolve between its neighbouring
  // source frames. 28 frames are substituted and the original timeline holds.
  "[0:v]split=5[opening][left][right][following][ending]",
  "[opening]trim=end_frame=1037,setpts=PTS-STARTPTS[openingTrim]",
  "[left]trim=start_frame=1036:end_frame=1037,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=1[leftHold]",
  "[right]trim=start_frame=1065:end_frame=1066,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=1[rightHold]",
  "[leftHold][rightHold]xfade=transition=fade:duration=0.6:offset=0.166667,trim=end_frame=28,setpts=PTS-STARTPTS[bridge]",
  "[following]trim=start_frame=1065:end_frame=2580,setpts=PTS-STARTPTS[followingTrim]",
  "[openingTrim][bridge][followingTrim]concat=n=3:v=1:a=0,settb=1/30,setpts=N,tpad=stop_mode=clone:stop_duration=0.2[v0]",
  ...scenes.map((_, i) =>
    `[${i + 1}:v]settb=1/30,setpts=N,tpad=start_mode=clone:start_duration=${half}:stop_mode=clone:stop_duration=${half}[v${i + 1}]`),
  "[ending]trim=start=111.5:end=206.9,settb=1/30,setpts=N,tpad=start_mode=clone:start_duration=0.2[v5]",
  ...edits.map((cut, i) =>
    `[${i === 0 ? "v0" : `x${i - 1}`}][v${i + 1}]xfade=transition=fade:duration=${transition}:offset=${cut - half}[x${i}]`),
  "[x4]setsar=1,format=yuv420p[video]",
].join(";");

// Preserve the verified continuous bed and both spoken passages. An even
// dynamics pass and a gentle closing fade avoid re-cutting the music at edits.
const audio = [
  "highpass=f=40",
  "acompressor=threshold=0.15:ratio=1.6:attack=25:release=420",
  "afade=t=out:st=204.75:d=2.15:curve=qsin",
];
const loudness = "loudnorm=I=-16.5:TP=-1.8:LRA=8";
const measured = ffmpeg(["-i", published, "-vn", "-af", [...audio, loudness + ":print_format=json"].join(","), "-f", "null", "-"], true);
const stats = JSON.parse(measured.slice(measured.lastIndexOf("{"), measured.lastIndexOf("}") + 1));
const normalize = [
  loudness,
  `measured_I=${stats.input_i}`,
  `measured_TP=${stats.input_tp}`,
  `measured_LRA=${stats.input_lra}`,
  `measured_thresh=${stats.input_thresh}`,
  `offset=${stats.target_offset}`,
  "linear=true",
].join(":");

const master = resolve(work, "Masjid Bilal Community Film.mp4");
ffmpeg([
  "-v", "warning", "-i", published, ...scenes.flatMap(file => ["-i", file]),
  "-filter_complex_threads", "2", "-filter_complex", timeline, "-map", "[video]", "-map", "0:a:0",
  "-t", String(duration), "-c:v", "libx264", "-preset", "fast", "-crf", "17", "-threads", "4",
  "-pix_fmt", "yuv420p", "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
  "-af", [...audio, normalize].join(","), "-ar", "48000", "-c:a", "aac", "-b:a", "256k",
  "-movflags", "+faststart", "-map_metadata", "-1",
  "-metadata", "title=Masjid Bilal — Our Community",
  "-metadata", "comment=HBIC community footage. Nasheed: Hona Marro — Mubarak al Nwaibet.",
  master,
]);

ffmpeg([
  "-v", "warning", "-i", master, "-c:v", "libx264", "-preset", "fast", "-crf", "20",
  "-maxrate", "3000k", "-bufsize", "6000k", "-threads", "4", "-profile:v", "high", "-level:v", "4.1",
  "-c:a", "copy", "-map_metadata", "0", "-movflags", "+faststart", resolve(work, "web-film.mp4"),
]);
writeFileSync(resolve(work, "edit-manifest.json"), JSON.stringify({
  duration, clips, edits, transition, repairedBlankFrames: [1037, 1065], audio, loudness, stats,
}, null, 2) + "\n");
