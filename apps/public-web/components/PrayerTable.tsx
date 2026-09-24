"use client";

import {
  congregationalPrayerOrder,
  defaultContent,
  formatCountdown,
  getPrayerCelestialPosition,
  getIqamahForPrayer,
  getNextPrayerFocus,
  prayerLabels,
  prayerOrder,
  resolveHijriDate,
  type HijriSettings,
  type IqamahTime,
  type PrayerName,
  type PrayerTime
} from "@hbic/shared";
import Image from "next/image";
import { CloudMoon, CloudSun, MoonStar, Sun, Sunrise, Sunset, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

type CongregationalPrayer = Exclude<PrayerName, "sunrise">;

const prayerVisuals: Record<CongregationalPrayer, { start: string; end: string; accent: string; soft: string; moment: string }> = {
  fajr: { start: "#112b4b", end: "#154d5e", accent: "#b9d7ff", soft: "#d9e8ff", moment: "A quiet beginning" },
  dhuhr: { start: "#075465", end: "#08394f", accent: "#f0d483", soft: "#c6f3ef", moment: "Pause and return" },
  asr: { start: "#164664", end: "#263f4f", accent: "#f2d58c", soft: "#c4e4f2", moment: "Carry the day with care" },
  maghrib: { start: "#453442", end: "#173347", accent: "#f2b778", soft: "#f5d8c4", moment: "Close the day with gratitude" },
  isha: { start: "#071d31", end: "#092c3b", accent: "#bbd8e9", soft: "#d5e7f1", moment: "End the day in peace" }
};

const prayerIcons: Record<PrayerName, LucideIcon> = {
  fajr: CloudMoon,
  sunrise: Sunrise,
  dhuhr: Sun,
  asr: CloudSun,
  maghrib: Sunset,
  isha: MoonStar
};

const browserPrayerAlertPreferenceKey = "hbic-browser-prayer-alerts-v1";
const browserPrayerAlertDeliveredKey = "hbic-browser-prayer-alert-last-v1";
const browserAdhanPreferenceKey = "hbic-browser-adhan-v1";
const browserAdhanPath = "/audio/adhan_madinah_marwan_qassas_short.mp3";

type PrayerStyle = CSSProperties & {
  "--prayer-start": string;
  "--prayer-end": string;
  "--prayer-accent": string;
  "--prayer-soft": string;
  "--prayer-sun-x": string;
  "--prayer-sun-y": string;
  "--prayer-sun-opacity": string;
};

export function PrayerTable({
  prayerTime = defaultContent.prayerTime,
  iqamahTime = defaultContent.iqamahTime,
  hijriSettings = defaultContent.hijriSettings,
  showWhiteDays = defaultContent.featureFlags.whiteDaysEnabled,
  initialNow
}: {
  prayerTime?: PrayerTime;
  iqamahTime?: IqamahTime;
  hijriSettings?: HijriSettings;
  showWhiteDays?: boolean;
  initialNow: string;
}) {
  const [now, setNow] = useState(() => new Date(initialNow));
  const [selectedPrayer, setSelectedPrayer] = useState<CongregationalPrayer | null>(null);
  const [showBlessing, setShowBlessing] = useState(false);
  const [browserAlertsEnabled, setBrowserAlertsEnabled] = useState(false);
  const [browserAdhanEnabled, setBrowserAdhanEnabled] = useState(false);
  const [browserAlertStatus, setBrowserAlertStatus] = useState("Browser prayer alerts are off.");
  const [browserAdhanStatus, setBrowserAdhanStatus] = useState("Adhan sound is off.");
  const previousUpcoming = useRef<{ id: string; name: CongregationalPrayer; date: Date; time: string } | null>(null);
  const browserAdhanAudio = useRef<HTMLAudioElement | null>(null);
  const dataAvailable = prayerOrder.every((name) => Boolean(prayerTime[name]?.trim()));
  const next = dataAvailable ? getNextPrayerFocus(prayerTime, iqamahTime, now) : null;
  const focusedPrayer = selectedPrayer ?? next?.name ?? "isha";
  const focusedAdhan = dataAvailable ? prayerTime[focusedPrayer] : "Unavailable";
  const focusedIqamah = dataAvailable ? getIqamahForPrayer(focusedPrayer, iqamahTime) ?? "No iqamah" : "Unavailable";
  const hijri = resolveHijriDate(now, hijriSettings);
  const visual = prayerVisuals[focusedPrayer];
  const celestial = getPrayerCelestialPosition(prayerTime, now);
  const style: PrayerStyle = {
    "--prayer-start": visual.start,
    "--prayer-end": visual.end,
    "--prayer-accent": visual.accent,
    "--prayer-soft": visual.soft,
    "--prayer-sun-x": `${6 + celestial.progress * 88}%`,
    "--prayer-sun-y": `${64 - celestial.altitude * 40}%`,
    "--prayer-sun-opacity": celestial.visibility.toFixed(3)
  };
  const dateLabel = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(now);

  const playBrowserAdhan = useCallback(async () => {
    const audio = browserAdhanAudio.current;
    if (!audio) throw new Error("Adhan audio is not ready.");
    audio.pause();
    audio.currentTime = 0;
    await audio.play();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const enabled = window.localStorage.getItem(browserPrayerAlertPreferenceKey) === "enabled";
    const adhanEnabled = window.localStorage.getItem(browserAdhanPreferenceKey) === "enabled";
    setBrowserAlertsEnabled(enabled);
    setBrowserAdhanEnabled(adhanEnabled);
    if (adhanEnabled) setBrowserAdhanStatus("Adhan sound is enabled while this page remains open.");
    if (!("Notification" in window)) setBrowserAlertStatus("Browser notifications are not supported here.");
    else if (enabled && window.Notification.permission === "granted") setBrowserAlertStatus("Browser prayer alerts are enabled while this page remains open.");
    else if (window.Notification.permission === "denied") setBrowserAlertStatus("Browser notifications are blocked in browser settings.");
  }, []);

  useEffect(() => {
    const audio = new Audio(browserAdhanPath);
    audio.preload = "auto";
    browserAdhanAudio.current = audio;
    return () => {
      audio.pause();
      browserAdhanAudio.current = null;
    };
  }, []);

  useEffect(() => {
    if (!next) return;
    const upcoming = {
      id: `${next.scheduleDate}:${next.name}:${next.date.toISOString()}`,
      name: next.name,
      date: next.date,
      time: next.time
    } satisfies { id: string; name: CongregationalPrayer; date: Date; time: string };
    const previous = previousUpcoming.current;
    previousUpcoming.current = upcoming;
    if (
      !previous ||
      previous.id === upcoming.id ||
      previous.date.getTime() > now.getTime() ||
      !browserAlertsEnabled ||
      !("Notification" in window) ||
      window.Notification.permission !== "granted" ||
      window.localStorage.getItem(browserPrayerAlertDeliveredKey) === previous.id
    ) return;

    new window.Notification(`${prayerLabels[previous.name]} at Masjid Bilal`, {
      body: `It is time for ${prayerLabels[previous.name]}. The published Adhan time is ${previous.time}.`,
      tag: previous.id
    });
    if (browserAdhanEnabled) {
      void playBrowserAdhan()
        .then(() => setBrowserAdhanStatus("Playing Adhan."))
        .catch(() => setBrowserAdhanStatus("The browser blocked Adhan playback. Use Test Adhan while this page is open."));
    }
    window.localStorage.setItem(browserPrayerAlertDeliveredKey, previous.id);
  }, [browserAdhanEnabled, browserAlertsEnabled, next, now, playBrowserAdhan]);

  async function toggleBrowserAlerts() {
    if (browserAlertsEnabled) {
      window.localStorage.removeItem(browserPrayerAlertPreferenceKey);
      setBrowserAlertsEnabled(false);
      setBrowserAlertStatus("Browser prayer alerts are off.");
      return;
    }
    if (!("Notification" in window)) {
      setBrowserAlertStatus("Browser notifications are not supported here.");
      return;
    }
    const permission = window.Notification.permission === "default"
      ? await window.Notification.requestPermission()
      : window.Notification.permission;
    if (permission !== "granted") {
      setBrowserAlertStatus(permission === "denied"
        ? "Browser notifications are blocked in browser settings."
        : "Browser notification permission was not enabled.");
      return;
    }
    window.localStorage.setItem(browserPrayerAlertPreferenceKey, "enabled");
    setBrowserAlertsEnabled(true);
    setBrowserAlertStatus("Browser prayer alerts are enabled while this page remains open.");
  }

  function testBrowserAlert() {
    if (!("Notification" in window) || window.Notification.permission !== "granted") {
      setBrowserAlertStatus("Enable browser prayer alerts before running the test.");
      return;
    }
    new window.Notification("Test Prayer Alert", {
      body: "This is a test from Masjid Bilal. It is not a real prayer alert.",
      tag: "hbic-browser-prayer-test"
    });
    setBrowserAlertStatus("A Test Prayer Alert was sent to this browser.");
  }

  async function toggleBrowserAdhan() {
    if (browserAdhanEnabled) {
      browserAdhanAudio.current?.pause();
      window.localStorage.removeItem(browserAdhanPreferenceKey);
      setBrowserAdhanEnabled(false);
      setBrowserAdhanStatus("Adhan sound is off.");
      return;
    }
    try {
      await playBrowserAdhan();
      window.localStorage.setItem(browserAdhanPreferenceKey, "enabled");
      setBrowserAdhanEnabled(true);
      setBrowserAdhanStatus("Adhan sound is enabled. This preview confirms browser playback.");
    } catch {
      setBrowserAdhanStatus("The browser blocked sound. Check site audio permission and try again.");
    }
  }

  async function testBrowserAdhan() {
    if (!browserAdhanEnabled) {
      setBrowserAdhanStatus("Enable Adhan sound before running the sound test.");
      return;
    }
    try {
      await playBrowserAdhan();
      setBrowserAdhanStatus("Playing the Adhan test.");
    } catch {
      setBrowserAdhanStatus("The browser blocked sound. Check site audio permission and try again.");
    }
  }

  const updatedAt = new Date(prayerTime.lastUpdated);
  const updatedLabel = Number.isNaN(updatedAt.getTime())
    ? null
    : updatedAt.toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Edmonton" });

  return (
    <div className="prayer-dashboard" style={style}>
      <div className="prayer-dashboard-topline" />
      <div className="prayer-celestial" aria-hidden="true"><span /></div>
      <div className="prayer-dashboard-meta">
        <button
          className="prayer-brand-mark"
          type="button"
          aria-label="Masjid Bilal"
          title="Masjid Bilal"
          onClick={() => setShowBlessing((visible) => !visible)}
        >
          <Image src="/brand/hbic-logo.png" alt="" width={42} height={42} />
          <span>Masjid Bilal</span>
        </button>
        <div className="prayer-date-block">
          <span>{dateLabel}</span>
          {hijri ? <span>{hijri.label}{showWhiteDays && hijri.isWhiteDay ? " · White Day" : ""}</span> : null}
        </div>
      </div>

      {showBlessing ? <p className="prayer-blessing" role="status">May your day carry barakah.</p> : null}

      <div className="prayer-focus">
        <span className="prayer-focus-kicker">{selectedPrayer === null ? "Next prayer" : "Prayer details"}</span>
        <h3>{prayerLabels[focusedPrayer]}</h3>
        <p className="prayer-focus-countdown">
          {selectedPrayer === null && next ? `${formatCountdown(next.date, now)} to ${next.kind}` : dateLabel}
        </p>
        <p className="prayer-moment">{visual.moment}</p>
      </div>

      <div className="prayer-time-pair" aria-label={`${prayerLabels[focusedPrayer]}. Adhan ${focusedAdhan}. Iqamah ${focusedIqamah}.`}>
        <div>
          <span>Adhan</span>
          <strong>{focusedAdhan}</strong>
        </div>
        <div>
          <span>Iqamah</span>
          <strong>{focusedIqamah}</strong>
        </div>
      </div>

      <div className="prayer-glass-selector" role="tablist" aria-label="Prayer selector">
        <button type="button" role="tab" aria-selected={selectedPrayer === null} className={selectedPrayer === null ? "selected" : ""} onClick={() => setSelectedPrayer(null)}>
          Now
        </button>
        {congregationalPrayerOrder.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={selectedPrayer === name}
            className={selectedPrayer === name ? "selected" : ""}
            onClick={() => setSelectedPrayer(name)}
          >
            {prayerLabels[name]}
          </button>
        ))}
      </div>

      <div className="prayer-schedule-heading">
        <div>
          <span className="kicker">Today</span>
          <h4>Prayer and iqamah</h4>
        </div>
        {updatedLabel ? <span className="prayer-freshness">Updated {updatedLabel}</span> : null}
      </div>

      <div className="prayer-schedule-header" aria-hidden="true">
        <span>Prayer</span>
        <span>Adhan</span>
        <span>Iqamah</span>
      </div>
      <div className="prayer-schedule-list">
        {prayerOrder.map((name) => {
          const iqamah = dataAvailable ? getIqamahForPrayer(name, iqamahTime) : undefined;
          const isNext = name === next?.name;
          const PrayerIcon = prayerIcons[name];
          return (
            <div className={`prayer-schedule-row${isNext ? " next" : ""}`} key={name} aria-current={isNext ? "true" : undefined}>
              <span className="prayer-name">
                <PrayerIcon aria-hidden="true" />
                {prayerLabels[name]}
                {isNext ? <small>Next</small> : null}
              </span>
              <span>{dataAvailable ? prayerTime[name] : "Unavailable"}</span>
              <strong>{dataAvailable ? iqamah ?? "—" : "Unavailable"}</strong>
            </div>
          );
        })}
      </div>
      {!dataAvailable ? <p className="prayer-unavailable">Current times are temporarily unavailable. Please check again shortly.</p> : null}
      <div className="browser-prayer-alerts">
        <div>
          <span className="kicker">Prayer alerts on this browser</span>
          <strong>{browserAlertsEnabled ? "On while this page is open" : "Off"}</strong>
          <p>{browserAlertStatus} Browser and device settings may affect notification sounds.</p>
          <p>{browserAdhanStatus} Closed-page Adhan audio is not supported.</p>
        </div>
        <div className="browser-prayer-alert-actions">
          <button type="button" onClick={toggleBrowserAlerts} aria-pressed={browserAlertsEnabled}>
            {browserAlertsEnabled ? "Turn off" : "Enable browser alerts"}
          </button>
          <button type="button" onClick={testBrowserAlert} disabled={!browserAlertsEnabled}>Test alert</button>
          <button type="button" onClick={toggleBrowserAdhan} aria-pressed={browserAdhanEnabled}>
            {browserAdhanEnabled ? "Turn Adhan off" : "Enable Adhan sound"}
          </button>
          <button type="button" onClick={testBrowserAdhan} disabled={!browserAdhanEnabled}>Test Adhan</button>
        </div>
      </div>
    </div>
  );
}
