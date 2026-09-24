export const appLaunchCampaign = {
  launchAt: "2026-09-18T04:11:14.000Z",
  timeZone: "America/Edmonton",
  appStoreUrl: "https://apps.apple.com/ca/app/masjid-bilal/id6790937097",
  googlePlayUrl: "https://play.google.com/store/apps/details?id=ca.hbic.calgary.app&hl=en_CA&gl=CA",
  linksVerifiedAt: "2026-09-18T04:05:00.000Z",
  linksReady: true
} as const;

/**
 * One durable launch gate for the website and prayer-hall display.
 * Setting NEXT_PUBLIC_APP_LAUNCH_DISABLED=true and redeploying is the rollback.
 */
export function isAppLaunchCampaignActive(now = new Date()) {
  const disabled = process.env.NEXT_PUBLIC_APP_LAUNCH_DISABLED === "true";
  return appLaunchCampaign.linksReady && !disabled && now.getTime() >= Date.parse(appLaunchCampaign.launchAt);
}
