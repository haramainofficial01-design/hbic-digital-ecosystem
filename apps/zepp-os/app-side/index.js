import { BaseSideService } from "@zeppos/zml/base-side";

const endpoint = "https://hbic.ca/api/content/prayer-snapshot";

function valid(snapshot) {
  return snapshot &&
    snapshot.schemaVersion === 2 &&
    snapshot.masjidID === "masjid-bilal-calgary" &&
    snapshot.masjidTimeZoneIdentifier === "America/Edmonton" &&
    snapshot.availability === "available" &&
    Array.isArray(snapshot.prayers) &&
    snapshot.prayers.length > 0;
}

async function loadSnapshot(res) {
  try {
    const response = await fetch({ url: endpoint, method: "GET" });
    const body = typeof response.body === "string" ? JSON.parse(response.body) : response.body;
    if (!body || body.ok !== true || !valid(body.snapshot)) throw new Error("Invalid HBIC snapshot");
    res(null, { ok: true, snapshot: body.snapshot });
  } catch (error) {
    res(null, { ok: false, error: "HBIC schedule could not be refreshed" });
  }
}

AppSideService(BaseSideService({
  onInit() {},
  onRequest(req, res) {
    if (req.method === "GET_PRAYER_SNAPSHOT") loadSnapshot(res);
  },
  onRun() {},
  onDestroy() {}
}));
