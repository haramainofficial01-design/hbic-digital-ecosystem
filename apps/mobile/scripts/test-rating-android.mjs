/** Emulator-only runtime checks against the private loopback rating fixture. */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
const serial = process.argv[2] ?? "emulator-5556";
if (!/^emulator-\d+$/.test(serial)) throw Error("Rating QA only supports an owned emulator");
const adb = process.env.HBIC_ADB ?? path.join(process.env.ANDROID_HOME ?? "", "platform-tools/adb");
const app = "ca.hbic.calgary.app";
const id = `qa-rating-android-${Date.now()}`;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const command = (...args) => execFileSync(adb, ["-s", serial, ...args], { encoding: "utf8", timeout: 30_000 });
const xml = () => { command("shell", "uiautomator", "dump", "/sdcard/hbic-rating-window.xml"); return command("shell", "cat", "/sdcard/hbic-rating-window.xml"); };
function element(label) {
  const text = xml();
  const nodes = [...text.matchAll(/<node\b[^>]*>/g)].map(match => match[0]);
  const node = nodes.find(value => value.includes(`content-desc="${label}"`)) ?? nodes.find(value => value.includes(`text="${label}"`));
  if (!node) return null;
  const bounds = node.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  return bounds ? { x: (+bounds[1] + +bounds[3]) / 2, y: (+bounds[2] + +bounds[4]) / 2 } : null;
}
async function tap(label) {
  for (let i = 0; i < 12; i++) {
    const point = element(label);
    if (point) { command("shell", "input", "tap", `${Math.round(point.x)}`, `${Math.round(point.y)}`); return; }
    command("shell", "input", "swipe", "160", "480", "160", "170", "350");
    await pause(500);
  }
  throw Error(`Missing native action: ${label}`);
}
async function configure(enabled, campaignId = id) {
  const response = await fetch("http://127.0.0.1:9221/qa/campaign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: campaignId, enabled }) });
  assert.equal(response.status, 200);
}
function ledger() {
  try { return JSON.parse(command("shell", "run-as", app, "cat", "files/hbic-rating-campaigns.json")); }
  catch { return { attempted: [] }; }
}
async function launch() {
  command("shell", "am", "force-stop", app); command("shell", "am", "start", "-n", `${app}/.MainActivity`);
  await pause(7_000);
  if (element("Skip introduction")) await tap("Skip introduction");
}
async function waitForInvitation() {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    if (element("Not Now")) return;
    await pause(1_000);
  }
  throw Error("Invitation did not appear on idle loaded native Android home");
}

await configure(false); await launch(); await pause(17_000);
assert.equal(element("Not Now"), null); assert.ok(!ledger().attempted.includes(id));
console.log("PASS: native remote-disabled campaign creates no invitation/claim");
await configure(true); await launch(); await waitForInvitation();
assert.ok(ledger().attempted.includes(id));
assert.ok(xml().includes("Enjoying the Masjid Bilal App? ⭐"));
const output = process.env.HBIC_RATING_QA_OUTPUT ?? "/tmp/hbic-rating-android-invitation.png";
fs.writeFileSync(output, execFileSync(adb, ["-s", serial, "exec-out", "screencap", "-p"]));
console.log("PASS: real Android invitation and exact copy; screenshot:", output);
await tap("Not Now"); assert.equal(element("Not Now"), null);
await launch(); await pause(17_000); assert.equal(element("Not Now"), null);
assert.equal(ledger().attempted.filter(value => value === id).length, 1);
console.log("PASS: native Not Now and restart persistence, exactly one claim");
await configure(true, `${id}-review`); await launch(); await waitForInvitation();
await tap("Rate Our App ⭐"); await pause(8_000);
const activity = command("shell", "dumpsys", "activity", "activities");
assert.match(activity, /(?:topResumedActivity=|ResumedActivity:)[^\n]*(?:com\.android\.vending|com\.android\.chrome|com\.android\.browser)/,
  "the store/browser handler must be foreground, not merely present in task history");
console.log("PASS: voluntary store-review action opens the installed official store/browser handler; no review posted");
await configure(false, `${id}-review`);
