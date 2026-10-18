import { appLaunchCampaign } from "../../lib/appLaunch";

export const dynamic = "force-dynamic";

/** One shareable link, using only the browser's existing device hint. */
export function GET(request: Request) {
  const agent = request.headers.get("user-agent") ?? "";
  let destination = "https://hbic.ca/app";
  // Windows Phone can include both Android and iPhone compatibility tokens.
  if (!/Windows Phone|Windows NT/i.test(agent)) {
    if (/\bAndroid\b/i.test(agent)) destination = appLaunchCampaign.googlePlayUrl;
    else if (/\biPhone\b|\biPad\b|\biPod\b/i.test(agent)) destination = appLaunchCampaign.appStoreUrl;
  }
  return new Response(null, {
    status: 307,
    headers: {
      Location: destination,
      "Cache-Control": "private, no-store, max-age=0",
      "Vercel-CDN-Cache-Control": "no-store",
      Vary: "User-Agent",
      "X-Robots-Tag": "noindex"
    }
  });
}

export const HEAD = GET;
