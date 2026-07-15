/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "watch-widget",
  name: "MasjidPrayerComplications",
  displayName: "Masjid Bilal",
  bundleIdentifier: ".watch.widgets",
  deploymentTarget: "10.0",
  appleTeamId: config.ios.appleTeamId,
  colors: {
    $accent: "#0C9BA8",
    $widgetBackground: "#062238"
  },
  entitlements: {
    "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"]
  }
});
