import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "../../..");
const hook = path.join(root, "apps/mobile/src/quran/useQuranAudio.ts");
const audioModule = `import {useEffect,useState} from 'react';
const listeners=new Set();let looping=false;let status={isLoaded:true,isBuffering:false,playing:true,currentTime:0,duration:1000,didJustFinish:false,playbackRate:1};
export const player={get isLoaded(){return status.isLoaded},get duration(){return status.duration},get playing(){return status.playing},
get loop(){return looping},set loop(value){looping=value},addListener(_,fn){listeners.add(fn);return {remove(){listeners.delete(fn)}}},replace(){looping=false;status={...status,playbackRate:1}},play(){status={...status,playing:true}},pause(){status={...status,playing:false}},async seekTo(seconds){status={...status,currentTime:seconds}},setPlaybackRate(rate){status={...status,playbackRate:rate}}};
export const useAudioPlayer=()=>player;export const setAudioModeAsync=async()=>{};
export function useAudioPlayerStatus(){const [value,set]=useState(status);useEffect(()=>{listeners.add(set);return()=>listeners.delete(set)},[]);return value}
window.emitStatus=()=>{status={...status,currentTime:status.currentTime+1};listeners.forEach(fn=>fn(status))};window.listenerCount=()=>listeners.size;
window.nativeResume=()=>{status={...status,playing:true};listeners.forEach(fn=>fn(status))};window.nativePlaying=()=>status.playing;
window.nativeOptions=()=>({loop:looping,rate:status.playbackRate,pitch:player.shouldCorrectPitch,currentTime:status.currentTime});
window.nativeFinish=()=>{status={...status,didJustFinish:true};listeners.forEach(fn=>fn(status))};`;
async function bundle(before: boolean) {
  const old = before ? execFileSync("git", ["show", "fdd2e97:apps/mobile/src/quran/useQuranAudio.ts"], { cwd: root, encoding: "utf8" }) : readFileSync(hook, "utf8");
  const result = await build({ write: false, bundle: true, platform: "browser", format: "iife", jsx: "automatic", define: { "process.env.NODE_ENV": '"production"' },
    stdin: { resolveDir: root, contents: `import React,{useEffect} from 'react';import{createRoot}from'react-dom/client';import{flushSync}from'react-dom';import{useAudioPlayerStatus}from'expo-audio';import{useQuranAudio}from'${hook}';
window.renders={reader:0,player:0};function Mini(){useAudioPlayerStatus();window.renders.player++;return React.createElement('div',null,'Audio progress')}
function Reader(){window.audio=useQuranAudio();window.renders.reader++;useEffect(()=>{window.ready=true},[]);return React.createElement(Mini)}
const root=createRoot(document.getElementById('root'));root.render(React.createElement(Reader));window.emitTick=()=>flushSync(()=>window.emitStatus());window.dispose=()=>flushSync(()=>root.unmount());` },
    plugins: [{ name: "native-audio-test-adapter", setup(b) {
      b.onResolve({ filter: /^expo-audio$/ }, () => ({ path: "audio", namespace: "fixture" }));
      b.onResolve({ filter: /^react-native$/ }, () => ({ path: "native", namespace: "fixture" }));
      b.onResolve({ filter: /^expo-router$/ }, () => ({ path: "router", namespace: "fixture" }));
      b.onResolve({ filter: /services\/quranListening$/ }, () => ({ path: "streams", namespace: "fixture" }));
      b.onLoad({ filter: /useQuranAudio\.ts$/ }, () => ({ contents: old, loader: "ts", resolveDir: path.dirname(hook) }));
      b.onLoad({ filter: /.*/, namespace: "fixture" }, args => ({ contents: args.path === "audio" ? audioModule : args.path === "native" ? "const listeners=new Set();export const AppState={currentState:'active',addEventListener(_,fn){listeners.add(fn);return{remove(){listeners.delete(fn)}}}};window.appState=state=>{AppState.currentState=state;listeners.forEach(fn=>fn(state))}" : args.path === "router" ? "import{useEffect}from'react';export const useFocusEffect=fn=>useEffect(()=>{const cleanup=fn();window.blurQuran=()=>cleanup?.();return cleanup},[fn])" : "export const validListeningUrl=()=>true", loader: "js", resolveDir: root }));
    } }] });
  return result.outputFiles[0].text;
}
test("60 progress events do not rerender the reader; the mini-player still updates and subscriptions clean up", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const counts: Record<string, {reader:number;player:number}> = {};
    for (const before of [true, false]) {
      const page = await browser.newPage(); await page.setContent(`<div id="root"></div><script>${await bundle(before)}</script>`);
      await page.waitForFunction(() => (window as any).ready);
      // Settle the initial loaded transition before measuring steady playback.
      await page.evaluate(() => { (window as any).emitTick(); });
      const start = await page.evaluate(() => ({ ...(window as any).renders }));
      for (let i = 0; i < 60; i++) await page.evaluate(() => (window as any).emitTick());
      const end = await page.evaluate(() => ({ ...(window as any).renders }));
      counts[before ? "before" : "after"] = { reader: end.reader - start.reader, player: end.player - start.player };
      await page.evaluate(() => (window as any).dispose());
      assert.equal(await page.evaluate(() => (window as any).listenerCount()), 0); await page.close();
    }
    assert.equal(counts.before.reader, 60); assert.equal(counts.after.reader, 0); assert.equal(counts.after.player, 60);
    console.log("Controlled React/native-event adapter (not a thermal measurement):", JSON.stringify(counts));
  } finally { await browser.close(); }
});
test("native foreground auto-resume cannot defeat an interruption pause; explicit Resume still works", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    await page.waitForFunction(() => (window as any).ready);
    await page.evaluate(async () => { await (window as any).audio.playStream("https://verified.example/reciter.mp3", "Reference", "Test adapter"); });
    assert.equal(await page.evaluate(() => (window as any).nativePlaying()), true);
    await page.evaluate(() => { (window as any).appState("background"); (window as any).appState("active"); (window as any).nativeResume(); });
    assert.equal(await page.evaluate(() => (window as any).nativePlaying()), false);
    await page.evaluate(async () => { await (window as any).audio.togglePause(); });
    assert.equal(await page.evaluate(() => (window as any).nativePlaying()), true);
    await page.evaluate(() => { (window as any).audio.stop(); (window as any).nativeResume(); });
    assert.equal(await page.evaluate(() => (window as any).nativePlaying()), false);
    await page.evaluate(() => (window as any).dispose());
    assert.equal(await page.evaluate(() => (window as any).listenerCount()), 0);
  } finally { await browser.close(); }
});
test("leaving Quran rejects a stale native resume without waiting for app background", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    await page.waitForFunction(() => (window as any).ready);
    await page.evaluate(async () => { await (window as any).audio.playStream("https://verified.example/reciter.mp3", "Reference", "Test adapter"); });
    await page.evaluate(() => { (window as any).blurQuran(); (window as any).nativeResume(); });
    assert.equal(await page.evaluate(() => (window as any).nativePlaying()), false);
    await page.evaluate(() => (window as any).dispose());
    assert.equal(await page.evaluate(() => (window as any).listenerCount()), 0);
  } finally { await browser.close(); }
});

test("stream and local recording loop/speed use native properties, survive interruption and reset looping on stop", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage(); await page.setContent(`<div id="root"></div><script>${await bundle(false)}</script>`);
    await page.waitForFunction(() => (window as any).ready);
    await page.evaluate(async () => { await (window as any).audio.playStream("https://verified.example/reciter.mp3", "Reference", "Test adapter"); });
    await page.evaluate(() => { (window as any).audio.setSpeed(.5); (window as any).audio.setLoopCurrent(true); });
    assert.deepEqual(await page.evaluate(() => (window as any).nativeOptions()), { loop: true, rate: .5, pitch: true, currentTime: 0 });
    await page.evaluate(() => (window as any).nativeFinish());
    assert.equal(await page.evaluate(() => Boolean((window as any).audio.externalPlayback)), true);
    await page.evaluate(() => { (window as any).appState("background"); (window as any).appState("active"); });
    assert.equal(await page.evaluate(() => (window as any).nativePlaying()), false);
    await page.evaluate(async () => { await (window as any).audio.togglePause(); await (window as any).audio.playRecording("file:///private/fixture-recording.m4a"); });
    assert.equal(await page.evaluate(() => (window as any).nativeOptions().rate), .5);
    assert.equal(await page.evaluate(() => (window as any).nativeOptions().loop), false, "new clip does not inherit looping");
    await page.evaluate(() => { (window as any).audio.setSpeed(2); (window as any).audio.setLoopCurrent(true); (window as any).audio.setSpeed(99); });
    assert.equal(await page.evaluate(() => (window as any).nativeOptions().rate), 2);
    await page.evaluate(async () => { await (window as any).audio.seek(20); await (window as any).audio.togglePause(); await (window as any).audio.replayCurrent(); });
    assert.equal(await page.evaluate(() => (window as any).nativeOptions().currentTime), 0);
    assert.equal(await page.evaluate(() => (window as any).nativePlaying()), true);
    await page.evaluate(() => (window as any).audio.stop());
    assert.equal(await page.evaluate(() => (window as any).nativeOptions().loop), false);
    assert.equal(await page.evaluate(() => (window as any).nativePlaying()), false);
    await page.evaluate(() => (window as any).dispose());
    assert.equal(await page.evaluate(() => (window as any).listenerCount()), 0);
  } finally { await browser.close(); }
});
