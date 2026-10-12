import assert from "node:assert/strict";
import test from "node:test";
import path from "node:path";
import { build } from "esbuild";
import { chromium } from "playwright";

const root = path.resolve(import.meta.dirname, "../../..");
const url = "https://server6.mp3quran.net/fixture/001.mp3";
function silentWave() {
  // Half-second PCM fixture, not a reciter recording or an accuracy evaluation.
  const samples = 8000, data = Buffer.alloc(44 + samples * 2);
  data.write("RIFF"); data.writeUInt32LE(data.length - 8, 4); data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16); data.writeUInt16LE(1, 20); data.writeUInt16LE(1, 22);
  data.writeUInt32LE(16000, 24); data.writeUInt32LE(32000, 28); data.writeUInt16LE(2, 32); data.writeUInt16LE(16, 34);
  data.write("data", 36); data.writeUInt32LE(samples * 2, 40);
  return data;
}
async function fixture() {
  const result = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic", outdir: "/tmp/hbic-quran-playback-render-only", define: { "process.env.NODE_ENV": '"production"' },
    stdin: { resolveDir: root, loader: "tsx", contents: `import React from'react';import{createRoot}from'react-dom/client';import{useWebQuranAudio,QuranPlaybackOptions}from'./apps/public-web/components/QuranReaderTools';import styles from'./apps/public-web/components/QuranReader.module.css';
const NativeAudio=window.Audio;window.audioElements=[];window.Audio=function(url){const element=new NativeAudio(url);window.audioElements.push(element);let previous=0;element.addEventListener('timeupdate',()=>{if(element.currentTime<previous)window.loopsObserved++;previous=element.currentTime});return element};window.loopsObserved=0;
function Fixture(){const audio=useWebQuranAudio();window.qaAudio=audio;return <><button onClick={()=>audio.playStream('${url}','Fixture stream')}>Start stream</button><button onClick={()=>audio.start([1,2],async n=>({verseKey:'1:'+n,audioUrl:'${url}'}))}>Start ayahs</button><div className={styles.audioPlayer} role="region" aria-label="Quran audio player"><div className={styles.audioHeading}><div><b>{audio.playback.title}</b><small>{audio.playback.phase}</small></div><button aria-label="Pause recitation" onClick={audio.pause}>Ⅱ</button><button aria-label="Resume recitation" onClick={()=>audio.resume()}>▶</button><button aria-label="Replay current recording" onClick={()=>audio.replayCurrent()}>↺</button><button aria-label="Stop recitation" onClick={audio.stop}>■</button></div><QuranPlaybackOptions speed={audio.speed} loop={audio.loopCurrent} onSpeed={audio.setSpeed} onLoop={audio.setLoopCurrent}/></div></>};createRoot(document.getElementById('root')).render(<Fixture/>);` },
    plugins: [{ name: "no-recognition-or-network-content", setup(b) {
      b.onResolve({ filter: /QuranReciteAssist$/ }, () => ({ path: "assist", namespace: "fixture" }));
      b.onResolve({ filter: /lib\/quranBrowser$/ }, () => ({ path: "content", namespace: "fixture" }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "assist" ? "export const QuranReciteAssist=()=>null" : "export const webQuranClient={}", loader: "js", resolveDir: root }));
    } }] });
  return { script: result.outputFiles.find(file => file.path.endsWith(".js"))!.text, css: result.outputFiles.find(file => file.path.endsWith(".css"))!.text };
}

test("real browser media loops, changes pitch-preserving speed, pauses/resumes/replays and stops; controls fit phones", async () => {
  const { script, css } = await fixture(), browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 1280]) {
      const page = await browser.newPage({ viewport: { width, height: 800 } });
      try {
        await page.route(url, route => route.fulfill({ contentType: "audio/wav", body: silentWave(), headers: { "Access-Control-Allow-Origin": "*" } }));
        await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:system-ui}${css}</style><div id="root"></div><script>${script}</script>`);
        await page.getByRole("button", { name: "Start stream", exact: true }).click();
        await page.waitForFunction(() => (window as any).qaAudio.playback.phase === "playing");
        await page.getByRole("button", { name: "Loop Off", exact: true }).click();
        await page.getByLabel("Playback speed", { exact: true }).selectOption("1.5");
        await page.waitForFunction(() => (window as any).loopsObserved >= 1, undefined, { timeout: 5000 });
        assert.deepEqual(await page.evaluate(() => { const audio = (window as any).audioElements.at(-1); return { loop: audio.loop, rate: audio.playbackRate, pitch: audio.preservesPitch }; }), { loop: true, rate: 1.5, pitch: true });
        await page.getByRole("button", { name: "Pause recitation" }).click();
        assert.equal(await page.evaluate(() => (window as any).audioElements.at(-1).paused), true);
        await page.getByRole("button", { name: "Replay current recording" }).click();
        await page.waitForFunction(() => !(window as any).audioElements.at(-1).paused);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Overflow at ${width}`);
        const region = await page.getByRole("region", { name: "Quran audio player" }).boundingBox();
        assert.ok(region && region.x >= 0 && region.x + region.width <= width && region.y >= 0 && region.y + region.height <= 800);
        await page.getByRole("button", { name: "Stop recitation" }).click();
        assert.equal(await page.evaluate(() => (window as any).audioElements.at(-1).paused), true);
        await page.getByRole("button", { name: "Loop Off", exact: true }).waitFor();
        await page.getByRole("button", { name: "Start ayahs", exact: true }).click();
        await page.waitForFunction(() => (window as any).qaAudio.playback.phase === "playing");
        assert.equal(await page.evaluate(() => (window as any).audioElements.at(-1).playbackRate), 1.5);
        await page.waitForFunction(() => (window as any).qaAudio.playback.phase === "idle", undefined, { timeout: 5000 });
        assert.equal(await page.evaluate(() => (window as any).audioElements.length), 3, "one stream and exactly two sequential ayahs");
      } finally { await page.close(); }
    }
  } finally { await browser.close(); }
});
