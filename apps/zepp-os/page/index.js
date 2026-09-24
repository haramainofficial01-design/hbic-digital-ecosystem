import { BasePage } from "@zeppos/zml/base-page";
import { LocalStorage } from "@zos/storage";
import * as hmUI from "@zos/ui";
import { log as Logger } from "@zos/utils";
import {
  BACKGROUND,
  BRAND,
  COUNTDOWN,
  PRAYER,
  REFRESH,
  STATUS,
  TIME
} from "zosLoader:./index.[pf].layout.js";

const logger = Logger.getLogger("hbic-prayer");
const storage = new LocalStorage();
const snapshotKey = "hbic_prayer_snapshot_v2";

function parse(value) {
  try {
    const snapshot = typeof value === "string" ? JSON.parse(value) : value;
    if (snapshot.schemaVersion !== 2 || snapshot.masjidID !== "masjid-bilal-calgary" || snapshot.masjidTimeZoneIdentifier !== "America/Edmonton") return null;
    return snapshot;
  } catch (_) {
    return null;
  }
}

function resolveFocus(snapshot, now = Date.now()) {
  if (!snapshot || snapshot.availability !== "available") return null;
  const prayers = snapshot.prayers.filter((entry) => entry.key !== "sunrise");
  for (let index = 0; index < prayers.length; index += 1) {
    const prayer = prayers[index];
    const adhan = Date.parse(prayer.adhanDate);
    const iqamah = prayer.iqamahDate ? Date.parse(prayer.iqamahDate) : NaN;
    if (now < adhan) return { name: prayer.name, kind: "Adhan", time: prayer.adhan, at: adhan };
    if (Number.isFinite(iqamah) && now < iqamah) return { name: prayer.name, kind: "Iqamah", time: prayer.iqamah, at: iqamah };
  }
  const fajr = prayers.find((entry) => entry.key === "fajr");
  const tomorrow = snapshot.tomorrowFajrDate ? Date.parse(snapshot.tomorrowFajrDate) : NaN;
  return fajr && Number.isFinite(tomorrow) && now < tomorrow
    ? { name: fajr.name, kind: "Adhan", time: fajr.adhan, at: tomorrow }
    : null;
}

function countdown(target, now = Date.now()) {
  const minutes = Math.max(0, Math.ceil((target - now) / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : minutes < 1 ? "<1m" : `${minutes}m`;
}

let prayerWidget;
let timeWidget;
let countdownWidget;
let statusWidget;
let timer;

Page(BasePage({
  state: { snapshot: null },
  build() {
    hmUI.createWidget(hmUI.widget.FILL_RECT, BACKGROUND);
    hmUI.createWidget(hmUI.widget.TEXT, BRAND);
    prayerWidget = hmUI.createWidget(hmUI.widget.TEXT, PRAYER);
    timeWidget = hmUI.createWidget(hmUI.widget.TEXT, TIME);
    countdownWidget = hmUI.createWidget(hmUI.widget.TEXT, COUNTDOWN);
    statusWidget = hmUI.createWidget(hmUI.widget.TEXT, STATUS);
    hmUI.createWidget(hmUI.widget.BUTTON, { ...REFRESH, click_func: () => this.refresh() });
    this.state.snapshot = parse(storage.getItem(snapshotKey, ""));
    this.renderSnapshot();
    this.refresh();
    timer = setInterval(() => this.renderSnapshot(), 30000);
  },
  refresh() {
    statusWidget.setProperty(hmUI.prop.TEXT, "Refreshing…");
    this.request({ method: "GET_PRAYER_SNAPSHOT" })
      .then((data) => {
        if (!data || !data.ok) throw new Error("Unavailable");
        const incoming = parse(data.snapshot);
        if (!incoming) throw new Error("Invalid");
        const current = this.state.snapshot;
        if (!current || Date.parse(incoming.generatedAt) >= Date.parse(current.generatedAt)) {
          this.state.snapshot = incoming;
          storage.setItem(snapshotKey, JSON.stringify(incoming));
        }
        this.renderSnapshot();
      })
      .catch(() => {
        logger.warn("Using cached HBIC prayer schedule");
        this.renderSnapshot(true);
      });
  },
  renderSnapshot(refreshFailed = false) {
    const now = Date.now();
    const snapshot = this.state.snapshot;
    const focus = resolveFocus(snapshot, now);
    if (!focus) {
      prayerWidget.setProperty(hmUI.prop.TEXT, "Times unavailable");
      timeWidget.setProperty(hmUI.prop.TEXT, "Open Zepp App");
      countdownWidget.setProperty(hmUI.prop.TEXT, "Connect phone to refresh");
      statusWidget.setProperty(hmUI.prop.TEXT, "No verified schedule");
      return;
    }
    prayerWidget.setProperty(hmUI.prop.TEXT, focus.kind === "Iqamah" ? `${focus.name} iqamah` : focus.name);
    timeWidget.setProperty(hmUI.prop.TEXT, focus.time);
    countdownWidget.setProperty(hmUI.prop.TEXT, countdown(focus.at, now));
    const expired = now >= Date.parse(snapshot.expiresAt);
    statusWidget.setProperty(hmUI.prop.TEXT, expired ? "Schedule expired · refresh needed" : refreshFailed || snapshot.stale ? "Cached schedule" : "Synced with Masjid Bilal");
  },
  onDestroy() {
    if (timer) clearInterval(timer);
  }
}));
