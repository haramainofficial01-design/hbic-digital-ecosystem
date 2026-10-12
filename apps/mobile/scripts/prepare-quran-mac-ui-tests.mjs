// Prepare an interactive native Mac test runner. This command only builds the
// runner; executing its xctestrun can activate app windows and requires consent
// to foreground testing. Never run it during background-only work.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

if (process.platform !== "darwin" || process.arch !== "arm64") throw Error("Designed-for-iPad Mac QA requires an Apple-silicon Mac");
if (!process.argv[2]) throw Error("Pass the existing signed HBIC Release .app path");
const app = path.resolve(process.argv[2]);
const identifier = execFileSync("plutil", ["-extract", "CFBundleIdentifier", "raw", path.join(app, "Info.plist")], { encoding: "utf8" }).trim();
if (identifier !== "ca.hbic.calgary.app") throw Error("Refusing to target a different app");
execFileSync("codesign", ["--verify", "--deep", "--strict", app]);
const developer = execFileSync("xcode-select", ["-p"], { encoding: "utf8" }).trim();
const dev = path.join(developer, "Platforms/MacOSX.platform/Developer");
const root = fs.mkdtempSync("/tmp/hbic-quran-mac-ui-");
const runner = path.join(root, "HBICQuranMacRunner.app");
execFileSync("ditto", [path.join(dev, "Library/Xcode/Agents/XCTRunner.app"), runner]);
// Match our test bundle architecture; the universal SDK runner also includes
// arm64e, which can otherwise be preferred and reject an arm64 test bundle.
const executable = path.join(runner, "Contents/MacOS/XCTRunner");
execFileSync("lipo", [executable, "-thin", "arm64", "-output", `${executable}.arm64`]);
fs.renameSync(`${executable}.arm64`, executable);
const frameworks = path.join(runner, "Contents/Frameworks");
fs.mkdirSync(frameworks, { recursive: true });
for (const dir of ["Library/Frameworks", "Library/PrivateFrameworks"])
  for (const name of fs.readdirSync(path.join(dev, dir)).filter(n => /^(XCTest|XCUI|XCTAutomation|XCUnit|Testing)/.test(n) && n.endsWith(".framework")))
    execFileSync("ditto", [path.join(dev, dir, name), path.join(frameworks, name)]);
for (const name of ["libXCTestSwiftSupport.dylib", "lib_TestingInterop.dylib"])
  fs.copyFileSync(path.join(dev, "usr/lib", name), path.join(frameworks, name));
for (const [key, value] of Object.entries({ CFBundleIdentifier: "ca.hbic.calgary.quranqa.macrunner", CFBundleExecutable: "XCTRunner", CFBundleName: "HBIC Quran Mac QA" }))
  execFileSync("plutil", ["-replace", key, "-string", value, path.join(runner, "Contents/Info.plist")]);
const bundle = path.join(runner, "Contents/PlugIns/HBICQuranMacUITests.xctest");
fs.mkdirSync(path.join(bundle, "Contents/MacOS"), { recursive: true });
fs.writeFileSync(path.join(bundle, "Contents/Info.plist"), JSON.stringify({ CFBundleExecutable: "HBICQuranMacUITests", CFBundleIdentifier: "ca.hbic.calgary.quranqa.mactests", CFBundlePackageType: "BNDL", CFBundleVersion: "1" }));
execFileSync("plutil", ["-convert", "xml1", path.join(bundle, "Contents/Info.plist")]);
const sdk = execFileSync("xcrun", ["--sdk", "macosx", "--show-sdk-path"], { encoding: "utf8" }).trim();
execFileSync("xcrun", ["swiftc", "-emit-library", "-module-name", "HBICQuranMacUITests", "-target", "arm64-apple-macos14.0", "-sdk", sdk,
  "-F", path.join(dev, "Library/Frameworks"), "-F", path.join(dev, "Library/PrivateFrameworks"), "-framework", "XCTest", "-framework", "XCUIAutomation",
  "-Xlinker", "-rpath", "-Xlinker", "@executable_path/../Frameworks", "-o", path.join(bundle, "Contents/MacOS/HBICQuranMacUITests"),
  path.resolve(import.meta.dirname, "../test/native/QuranMacUITests.swift")], { stdio: "inherit" });
execFileSync("codesign", ["--force", "--deep", "--sign", "-", runner], { stdio: "inherit" });
const file = path.join(root, "HBICQuranMacQA.xctestrun");
fs.writeFileSync(file, JSON.stringify({ HBICQuranMacUITests: {
  TestBundlePath: bundle, TestHostPath: runner, TestHostBundleIdentifier: "ca.hbic.calgary.quranqa.macrunner", IsUITestBundle: true,
  UITargetAppPath: app, UITargetAppBundleIdentifier: "ca.hbic.calgary.app", IsAppHostedTestBundle: true,
  TestingEnvironmentVariables: { DYLD_FRAMEWORK_PATH: frameworks }, DependentProductPaths: [bundle, runner]
}, __xctestrun_metadata__: { FormatVersion: 1 } }));
execFileSync("plutil", ["-convert", "xml1", file]);
console.log(file);
