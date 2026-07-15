import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const mobileRoot = path.resolve(scriptDirectory, "..");
const iosRoot = path.join(mobileRoot, "ios");
const projectName = readdirSync(iosRoot).find((entry) => entry.endsWith(".xcodeproj"));
if (!projectName) throw new Error("No generated Xcode project exists. Run npm run native:sync:ios first.");
const projectPath = path.join(iosRoot, projectName);
const projectFile = path.join(projectPath, "project.pbxproj");
const sharedSchemesDirectory = path.join(projectPath, "xcshareddata", "xcschemes");

const listing = JSON.parse(
  execFileSync("xcodebuild", ["-project", projectPath, "-list", "-json"], { encoding: "utf8" })
);
const targets = new Set(listing.project?.targets ?? []);
const schemes = new Set(listing.project?.schemes ?? []);
const project = readFileSync(projectFile, "utf8");

const mainTarget = listing.project?.name;
const requiredTargets = [mainTarget, "MasjidPrayerWidgets", "MasjidBilalWatch", "MasjidPrayerComplications"];
const requiredBundleIdentifiers = [
  "ca.hbic.calgary.app",
  "ca.hbic.calgary.app.widgets",
  "ca.hbic.calgary.app.watch",
  "ca.hbic.calgary.app.watch.widgets"
];

const errors = [];
for (const target of requiredTargets) {
  if (!targets.has(target)) errors.push(`Missing native target: ${target}`);
}
for (const identifier of requiredBundleIdentifiers) {
  if (!project.includes(identifier)) errors.push(`Missing bundle identifier: ${identifier}`);
}
if (!project.includes("Embed Watch Content")) errors.push("The Watch app is not embedded in the iOS app.");
if (!project.includes("Embed Foundation Extensions")) errors.push("An extension embed phase is missing.");
for (const scheme of requiredTargets) {
  if (!scheme || !schemes.has(scheme)) errors.push(`Missing Xcode scheme: ${scheme}`);
  if (scheme && !existsSync(path.join(sharedSchemesDirectory, `${scheme}.xcscheme`))) {
    errors.push(`Missing shared scheme file: ${scheme}`);
  }
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(JSON.stringify({ targets: [...targets], schemes: [...schemes], bundleIdentifiers: requiredBundleIdentifiers }, null, 2));
