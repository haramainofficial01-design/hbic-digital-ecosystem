// Ephemerally signed standalone emulator instrumentation; no HBIC signing or
// native-project edits. Never install this test package on a personal device.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), "Library/Android/sdk");
const versions = dir => fs.readdirSync(path.join(sdk, dir)).filter(v => /\d/.test(v)).sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
const build = path.join(sdk, "build-tools", versions("build-tools")[0]);
const android = path.join(sdk, "platforms", versions("platforms")[0], "android.jar");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "hbic-quran-android-qa-")), classes = path.join(root, "classes"), dex = path.join(root, "dex");
fs.mkdirSync(classes); fs.mkdirSync(dex);
const java = name => process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", name) : name;
execFileSync(java("javac"), ["-source", "8", "-target", "8", "-classpath", android, "-d", classes, path.resolve(import.meta.dirname, "../test/native/QuranTreeInstrumentation.java")]);
execFileSync(path.join(build, "d8"), ["--lib", android, "--output", dex, path.join(classes, "ca/hbic/quranqa/QuranTreeInstrumentation.class")]);
const apk = path.join(root, "snapshot.apk");
execFileSync(path.join(build, "aapt2"), ["link", "--manifest", path.resolve(import.meta.dirname, "../test/native/AndroidQuranQA.xml"), "-I", android, "-o", apk]);
execFileSync("zip", ["-q", apk, "classes.dex"], { cwd: dex });
const password = randomBytes(24).toString("hex"), key = path.join(root, "test-signing.p12");
execFileSync(java("keytool"), ["-genkeypair", "-keystore", key, "-storepass", password, "-keypass", password, "-alias", "qa", "-keyalg", "RSA", "-validity", "2", "-dname", "CN=Local Quran Emulator QA"], { stdio: "pipe" });
execFileSync(path.join(build, "apksigner"), ["sign", "--ks", key, "--ks-pass", `pass:${password}`, apk], { stdio: "pipe" });
fs.unlinkSync(key);
const device = process.env.HBIC_QA_ANDROID_DEVICE || "emulator-5554";
if (!/^emulator-\d+$/.test(device)) throw Error("Use a dedicated emulator, not a personal device.");
try { execFileSync(path.join(sdk, "platform-tools/adb"), ["-s", device, "uninstall", "ca.hbic.quranqa"], { stdio: "pipe" }); } catch { /* First installation has no test-only package. */ }
execFileSync(path.join(sdk, "platform-tools/adb"), ["-s", device, "install", "-t", apk], { stdio: "pipe" });
console.log(apk);
