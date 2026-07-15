/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "MasjidPrayerWidgets",
  displayName: "Masjid Bilal",
  bundleIdentifier: ".widgets",
  deploymentTarget: "17.0",
  appleTeamId: config.ios.appleTeamId,
  colors: {
    $accent: "#0C9BA8",
    $widgetBackground: "#062238"
  },
  entitlements: {
    "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"]
  }
});
