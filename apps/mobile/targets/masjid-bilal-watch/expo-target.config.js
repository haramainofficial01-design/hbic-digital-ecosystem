/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
// Copy only deterministic, licensed Quran resources from the phone's source.
require("node:child_process").execFileSync(process.execPath, [
  require("node:path").resolve(__dirname, "../../scripts/sync-watch-quran.mjs")
]);
require("node:child_process").execFileSync(process.execPath, [
  require("node:path").resolve(__dirname, "../../scripts/sync-watch-bilal.mjs")
]);
module.exports = (config) => ({
  type: "watch",
  name: "MasjidBilalWatch",
  displayName: "Masjid Bilal",
  bundleIdentifier: ".watch",
  deploymentTarget: "10.0",
  appleTeamId: config.ios.appleTeamId,
  icon: "../../assets/brand/hbic-app-icon.png",
  frameworks: ["SwiftUI", "WatchConnectivity", "WidgetKit", "AVFoundation", "CoreText"],
  colors: {
    $accent: "#0C9BA8"
  },
  entitlements: {
    "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"]
  }
});
