/** Local-only simulator fixture. Never deployed or used by the production app. */
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { normalizeContent, dateStringInTimeZone, masjidTimeZone } from "@hbic/shared";

const device = process.env.HBIC_RATING_SIMULATOR;
let campaign = { id: "qa-rating-native", enabled: false };
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1:9221").pathname;
  console.log(request.method, pathname);
  response.setHeader("Content-Type", "application/json");
  if (pathname === "/api/content/published") {
    const content = normalizeContent();
    content.settings.ratingCampaign = campaign;
    content.updatedAt = new Date().toISOString();
    content.prayerTime.date = dateStringInTimeZone(new Date(), masjidTimeZone);
    content.announcements = [];
    // Synthetic schedule deliberately far from the QA clock, not real prayer data.
    const clock = new Intl.DateTimeFormat("en-CA", { timeZone: masjidTimeZone, hour: "numeric", minute: "2-digit", hour12: true });
    const distantTime = clock.format(new Date(Date.now() + 12 * 60 * 60_000)).toUpperCase();
    Object.assign(content.prayerTime, { fajr: distantTime, sunrise: distantTime, dhuhr: distantTime, asr: distantTime, maghrib: distantTime, isha: distantTime });
    Object.assign(content.iqamahTime, { fajrIqamah: distantTime, dhuhrIqamah: distantTime, asrIqamah: distantTime, maghribIqamah: distantTime, ishaIqamah: distantTime });
    response.end(JSON.stringify({ content })); return;
  }
  if (pathname === "/qa/campaign" && request.method === "POST") {
    let body = ""; for await (const chunk of request) body += chunk;
    try {
      const input = JSON.parse(body);
      if (!/^qa-[a-z0-9_-]{1,50}$/.test(input.id) || typeof input.enabled !== "boolean") throw Error("Invalid QA campaign");
      campaign = input; response.end(JSON.stringify(campaign));
    } catch { response.statusCode = 400; response.end("{}"); }
    return;
  }
  if (pathname === "/qa/ledger" && device) {
    try {
      const directory = execFileSync("xcrun", ["simctl", "get_app_container", device, "ca.hbic.calgary.app", "data"], { encoding: "utf8" }).trim();
      response.end(readFileSync(`${directory}/Documents/hbic-rating-campaigns.json`, "utf8"));
    } catch { response.end('{"version":1,"attempted":[]}'); }
    return;
  }
  // No registration, push, payments or other production writes from QA.
  response.statusCode = 403; response.end('{"error":"Local rating QA only"}');
});
server.listen(9221, "127.0.0.1", () => console.log("Private rating fixture: http://127.0.0.1:9221"));
