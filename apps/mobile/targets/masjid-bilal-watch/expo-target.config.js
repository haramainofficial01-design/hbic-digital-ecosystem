/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "watch",
  name: "MasjidBilalWatch",
  displayName: "Masjid Bilal",
  bundleIdentifier: ".watch",
  deploymentTarget: "10.0",
  appleTeamId: config.ios.appleTeamId,
  icon: "../../assets/brand/hbic-app-icon.png",
  frameworks: ["SwiftUI", "WatchConnectivity", "WidgetKit"],
  colors: {
    $accent: "#0C9BA8"
  },
  entitlements: {
    "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"]
  }
});
