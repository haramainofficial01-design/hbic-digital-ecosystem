export const appReviewLinks = {
  ios: "https://apps.apple.com/app/masjid-bilal/id6790937097?action=write-review",
  android: "https://play.google.com/store/apps/details?id=ca.hbic.calgary.app&showAllReviews=true",
  androidNative: "market://details?id=ca.hbic.calgary.app&showAllReviews=true"
} as const;

export async function openAppReview(platform: string, openURL: (url: string) => Promise<unknown>): Promise<void> {
  if (platform === "ios") { await openURL(appReviewLinks.ios); return; }
  if (platform === "android") {
    try { await openURL(appReviewLinks.androidNative); }
    catch { await openURL(appReviewLinks.android); }
    return;
  }
  throw new Error("Store reviews are available in the iOS and Android app");
}
