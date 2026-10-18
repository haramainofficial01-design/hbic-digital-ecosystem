import assert from "node:assert/strict";
import test from "node:test";
import { GET, HEAD, dynamic } from "../app/download/route";
import { appLaunchCampaign } from "../lib/appLaunch";

const iphone = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const android = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/141.0.0.0 Mobile Safari/537.36";
function request(agent?: string, method = "GET", query = "") {
  return new Request(`https://hbic.ca/download${query}`, { method, headers: agent === undefined ? {} : { "User-Agent": agent } });
}

test("the single download link sends iPhone, iPad, iPod and in-app iOS browsers to the official Apple listing", () => {
  for (const agent of [iphone, iphone + " [FBAN/FBIOS]", "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)", "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)"]) {
    const response = GET(request(agent));
    assert.equal(response.status, 307);
    assert.equal(response.headers.get("location"), appLaunchCampaign.appStoreUrl);
    assert.equal(new URL(response.headers.get("location")!).pathname.split("/").at(-1), "id6790937097");
  }
});
test("Android phone, tablet and in-app browsers go to the official Google Play listing", () => {
  for (const agent of [android, android + " [FBAN/FB4A]", "Mozilla/5.0 (Linux; Android 13; SM-X710) SamsungBrowser/28.0", "android"]) {
    const response = GET(request(agent));
    assert.equal(response.status, 307);
    const url = new URL(response.headers.get("location")!);
    assert.equal(response.headers.get("location"), appLaunchCampaign.googlePlayUrl);
    assert.equal(url.hostname, "play.google.com");
    assert.equal(url.searchParams.get("id"), "ca.hbic.calgary.app");
  }
});
test("desktop, missing/unknown device hints and unsupported phones show the existing two-store page", () => {
  for (const agent of [undefined, "", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Mozilla/5.0 (Windows Phone 10.0; Android 6.0.1; Microsoft; Lumia 950) like iPhone", "WhatsApp/2.26", "unknown"]) {
    assert.equal(GET(request(agent)).headers.get("location"), "https://hbic.ca/app");
  }
});
test("device-specific redirects are temporary and cannot be shared or cached across phone types", async () => {
  assert.equal(dynamic, "force-dynamic");
  for (const agent of [iphone, android, undefined, iphone]) {
    const response = GET(request(agent));
    assert.equal(response.status, 307);
    assert.match(response.headers.get("cache-control")!, /private, no-store/);
    assert.equal(response.headers.get("vercel-cdn-cache-control"), "no-store");
    assert.equal(response.headers.get("vary"), "User-Agent");
    assert.equal(response.headers.get("x-robots-tag"), "noindex");
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(await response.text(), "");
  }
});
test("HEAD uses the same safe target; query strings cannot create an open redirect or leak to stores", async () => {
  for (const agent of [iphone, android, undefined]) {
    const response = HEAD(request(agent, "HEAD", "?url=https://untrusted.example&token=private"));
    assert.equal(response.headers.get("location"), GET(request(agent)).headers.get("location"));
    assert.doesNotMatch(response.headers.get("location")!, /untrusted|private|token/);
    assert.equal(await response.text(), "");
  }
});
