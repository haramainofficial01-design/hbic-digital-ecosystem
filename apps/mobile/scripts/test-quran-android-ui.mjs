// Native release APK smoke check. Host microphone is disabled: only emulator
// silence is captured. This is NOT a recognition-accuracy/thermal measurement.
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
const adb = process.env.HBIC_QA_ADB || path.join(process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), "Library/Android/sdk"), "platform-tools/adb");
const device = process.env.HBIC_QA_ANDROID_DEVICE || "emulator-5554";
if (!/^emulator-\d+$/.test(device)) throw Error("Native Quran QA must use a dedicated emulator, never a parent's phone");
const root = path.resolve(import.meta.dirname, "../../.."), output = path.join(root, "output/quran-optimization");
mkdirSync(output, { recursive: true });
const call = (...args) => execFileSync(adb, ["-s", device, ...args], { encoding: "utf8", timeout: 20000 });
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
function ui() {
  const result = call("shell", "am", "instrument", "-w", "ca.hbic.quranqa/ca.hbic.quranqa.QuranTreeInstrumentation");
  const xml = result.match(/INSTRUMENTATION_RESULT: hbic_tree=(<hierarchy>.*<\/hierarchy>)/)?.[1];
  if (!xml) throw Error("Fresh native snapshot unavailable. Run prepare-quran-android-ui.mjs on the dedicated QA emulator first.");
  return xml;
}
function nodes(xml) { return [...xml.matchAll(/<node\s+([^>]+)>/g)].map(m => Object.fromEntries([...m[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], a[2].replaceAll("&amp;", "&").replaceAll("&quot;", '"')]))); }
const size = call("shell", "wm", "size").match(/(\d+)x(\d+)/), width = Number(size[1]), height = Number(size[2]);
async function tap(label, prefix = false, press = true) {
  let direction = "up";
  const fixed = ["Skip introduction", "Read", "Listen", "Practise", "Library", "Quran home", "Quran preferences", "Search Quran", "Focus reading", "Leave focus", "Pause audio", "Resume audio", "Stop audio"].includes(label);
  const match = n => n.clickable === "true" && n.enabled === "true" && [n["content-desc"], n.text].some(v => prefix ? v?.startsWith(label) : v?.toLowerCase() === label.toLowerCase());
  for (let i = 0; i < 12; i++) {
    const item = nodes(ui()).find(match);
    if (item) {
      const b = item.bounds.match(/-?\d+/g).map(Number);
      if (b[2] > b[0] && b[3] > b[1] && b[1] >= 0 && b[3] <= height
        && (fixed || b[1] >= height * .17 && b[3] <= height * .9)) {
        // Native scrolling can still be decelerating. Confirm geometry rather
        // than waiting for all audio progress events to become idle.
        await wait(200); const settled = nodes(ui()).find(match);
        if (!settled || settled.bounds !== item.bounds) continue;
        if (!press) return item;
        console.log(`Tap: ${label} ${item.bounds}`);
        call("shell", "input", "tap", String((b[0] + b[2]) / 2 | 0), String((b[1] + b[3]) / 2 | 0)); await wait(600); return item;
      }
      direction = b[3] < height * .2 ? "down" : "up";
    }
    if (!item && i === 5) direction = direction === "up" ? "down" : "up";
    const start = direction === "up" ? .72 : .38, end = direction === "up" ? .38 : .72;
    call("shell", "input", "swipe", String(width / 2 | 0), String(height * start | 0), String(width / 2 | 0), String(height * end | 0), "250"); await wait(750);
  }
  throw Error(`Native control missing: ${label}`);
}
function check(value, message) { if (!value) throw Error(message); }
async function waitForText(text, timeout = 5000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (ui().includes(text)) return true; await wait(200); }
  return false;
}
function screenshot(name) { writeFileSync(path.join(output, `${name}.png`), execFileSync(adb, ["-s", device, "exec-out", "screencap", "-p"])); }
call("emu", "avd", "hostmicoff");
call("shell", "cmd", "uimode", "night", "no");
call("shell", "am", "start", "-W", "-a", "android.intent.action.VIEW", "-d", "hbiccalgary://quran", "ca.hbic.calgary.app"); await wait(2000);
let xml = ui(); if (xml.includes('content-desc="Skip introduction"')) await tap("Skip introduction");
await tap("Read"); check(ui().includes("Al-Fatihah"), "Canonical surah did not load"); screenshot("android-reader");
await tap("Focus reading"); check(!ui().includes('content-desc="Quran preferences"'), "Preferences obscured focus mode");
await tap("Leave focus"); check(ui().includes('content-desc="Quran preferences"'), "Focus mode could not be exited");
await tap("Library"); check(ui().includes("Recordings (0)"), "Use a clean QA emulator; no existing recordings were modified");
await tap("Word review (0)"); check(ui().includes("No possible-word flags to review."), "Empty review state missing"); screenshot("android-private-library");
await tap("Practise"); await tap("Hide"); await tap("Word hint"); await tap("Reveal"); screenshot("android-practice");
await tap("Recording options"); const retention = await tap("Keep recordings after this session", false, false);
check(retention, "Recording privacy choice missing"); if (retention.checked === "true") await tap("Keep recordings after this session");
call("shell", "pm", "grant", "ca.hbic.calgary.app", "android.permission.RECORD_AUDIO");
await tap("Record my recitation"); await wait(10000); await tap("Stop and review recording");
await tap("Play temporary recording"); check(ui().includes('content-desc="Pause audio"'), "Temporary recording playback did not start"); await tap("Stop audio");
await tap("Keep this recording"); await tap("Library"); await tap("Recordings (1)"); screenshot("android-kept-recording");
await tap("Play recording"); check(ui().includes('content-desc="Pause audio"'), "Kept recording playback did not start"); await tap("Stop audio");
await tap("Delete recording"); await tap("Delete"); check(ui().includes("Recordings (0)"), "Test recording was not removed");
await tap("Practise"); await tap("Record my recitation"); await wait(3000);
call("shell", "input", "keyevent", "3"); await wait(500); call("shell", "am", "start", "-W", "-n", "ca.hbic.calgary.app/.MainActivity"); await wait(1000);
check(!ui().includes('content-desc="Stop and review recording"') && !ui().includes('content-desc="Play temporary recording"'), "Background capture/session-only audio was not cleared");
await tap("Practise"); await tap("Test yourself"); await tap("Start self-test");
await tap("Word hint"); await tap("Reveal ayah"); await tap("Hide ayah"); screenshot("android-self-test");
await tap("Reveal ayah"); await tap("Recalled · next"); check(ui().includes('content-desc="Reveal ayah"'), "Self-test did not advance");
await tap("Listen"); if (ui().includes('content-desc="Choose another reciter"')) await tap("Choose another reciter");
await tap("Find a reciter"); call("shell", "input", "text", "Mishary"); await wait(500);
await tap("Select reciter Mishary", true); await tap("Play Al-Fatihah by ", true);
check(await waitForText('content-desc="Pause audio"', 20000), "Verified reciter stream did not start");
const audioDeadline = Date.now() + 20000;
let progressed = false;
while (Date.now() < audioDeadline) {
  progressed = nodes(ui()).some(n => /^\d+:\d{2} \/ \d+:\d{2}$/.test(n.text)
    && !n.text.startsWith("0:00 / ") && !n.text.endsWith(" / 0:00"));
  if (progressed) break; await wait(500);
}
check(progressed, "Native stream did not load a duration and advance playback"); screenshot("android-streaming-player");
await tap("Pause audio"); await tap("Resume audio");
call("shell", "input", "keyevent", "3"); await wait(500); call("shell", "am", "start", "-W", "-n", "ca.hbic.calgary.app/.MainActivity"); await wait(500);
check(await waitForText('content-desc="Resume audio"'), "Background interruption did not pause playback");
await tap("Resume audio"); await tap("Stop audio");
call("shell", "cmd", "uimode", "night", "yes"); await tap("Read"); await wait(500); screenshot("android-reader-dark");
console.log("ANDROID NATIVE RELEASE QA PASS: canonical reader, private library, hide/hint/reveal, self-test, emulator-silence recording, temporary playback, keep/replay/delete, background capture cleanup, real reciter stream/pause/resume/stop, interruption stays paused, dark reader. No cloud signup or Academy/payment actions.");

if (process.env.HBIC_QA_RECITE_LIFECYCLE === "1") {
  // Optional explicit QA download, only on the disposable, host-mic-disabled
  // emulator. Silence validates lifecycle/resource handling, never accuracy.
  check(/^emulator-\d+$/.test(device), "Recognition lifecycle requires a dedicated emulator");
  await tap("Practise"); await tap("Start Recite Assist"); await tap("Continue");
  check(await waitForText('content-desc="Pause Recite Assist"', 120000), "Current native recognition model could not prepare");
  await wait(4000);
  check(!ui().includes("Following the recited words.") && !ui().includes("Possible word difference. Reveal and review"), "Emulator silence was incorrectly assessed");
  await tap("Pause Recite Assist"); check(await waitForText("The microphone is off"), "Pause did not release native capture");
  await tap("Resume Recite Assist"); check(await waitForText('content-desc="Pause Recite Assist"'), "Resume did not restart capture");
  await tap("Stop Recite Assist"); check(await waitForText("Session review"), "Stop did not produce a session summary");
  check(ui().includes("0 listening observations") && ui().includes("not saved or uploaded"), "Silence triggered inference or unexpected audio retention");
  screenshot("android-recognition-silence-review");
  await tap("Start Recite Assist"); await tap("Continue");
  check(await waitForText('content-desc="Pause Recite Assist"', 30000), "Recognition could not restart after release");
  call("shell", "input", "keyevent", "3"); await wait(700);
  call("shell", "am", "start", "-W", "-n", "ca.hbic.calgary.app/.MainActivity"); await wait(1000);
  check(await waitForText('content-desc="Start Recite Assist"'), "Background did not stop native recognition capture");
  check(!ui().includes('content-desc="Pause Recite Assist"'), "Recognition capture survived background exit");
  console.log("ANDROID CURRENT RECITE LIFECYCLE PASS: real native model preparation, PCM silence, zero inference on silence, pause/resume, stop/review, restart, background cleanup. No human-acoustic, recognition-accuracy or thermal claim.");
}
