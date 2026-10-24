"use client";

import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { formatCountdown, masjidTimeZone, type PrayerName, type WidgetPrayerEntry } from "@hbic/shared";
import {
  deriveCurrentPrayerKey,
  deriveDisplayFocus,
  deriveDisplayAtmosphere,
  displayRenderSignature,
  deriveWeatherVisualState,
  isAppLaunchTeaserActive,
  isJumuahDisplayWindow,
  isDisplayAnnouncementActive,
  nextDisplayScheduleUpdateMs,
  preferCachedDisplay,
  snapshotMatchesCalgaryDate,
  socialHandle,
  type TvDisplayPayload,
  type TvWeatherMode,
  type TvWeatherReading,
  type TvWeatherVisualState
} from "../lib/tvDisplay";
import styles from "./TvPrayerDisplay.module.css";
import { publicDisplayUrl } from "../lib/displayClient";
import { appDownloadQr, appDownloadUrl } from "../lib/appLaunch";
import { startTvWeatherScene } from "../lib/tvWeatherCanvas";

const cacheKey = "hbic-tv-display-v1";
const weatherCacheKey = "hbic-tv-weather-v1";
const arabicPrayerNames: Record<PrayerName, string> = {
  fajr: "الفجر",
  sunrise: "الشروق",
  dhuhr: "الظهر",
  asr: "العصر",
  maghrib: "المغرب",
  isha: "العشاء"
};

const calgaryDigitalClockFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: masjidTimeZone,
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit"
});

const calgaryTimeLabelFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: masjidTimeZone,
  hour: "numeric",
  minute: "2-digit"
});

const calgaryDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: masjidTimeZone,
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric"
});

function readLocalCache(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Some embedded TV browsers disable storage or expose a full storage area.
    return null;
  }
}

function writeLocalCache(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // The live schedule remains usable when this browser cannot persist a cache.
  }
}

function removeLocalCache(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage is an optional offline enhancement, not a rendering dependency.
  }
}

function useAlignedClock(initialDate: string) {
  const [now, setNow] = useState(() => new Date(initialDate));

  useEffect(() => {
    let timer: number | undefined;

    const clearTimer = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
    };

    const tick = () => {
      if (document.visibilityState === "hidden") return;
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(tick, 1_005 - current.getMilliseconds());
    };

    const visibilityChanged = () => {
      clearTimer();
      if (document.visibilityState !== "hidden") tick();
    };

    tick();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      clearTimer();
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, []);

  return now;
}

function usePrayerScheduleClock(initialDate: string, snapshot: TvDisplayPayload["snapshot"]) {
  const [now, setNow] = useState(() => new Date(initialDate));

  useEffect(() => {
    let timer: number | undefined;
    const tick = () => {
      if (document.visibilityState === "hidden") return;
      const current = new Date();
      setNow(current);
      timer = window.setTimeout(tick, nextDisplayScheduleUpdateMs(snapshot, current));
    };
    const resume = () => {
      if (timer !== undefined) window.clearTimeout(timer);
      timer = undefined;
      tick();
    };
    resume();
    document.addEventListener("visibilitychange", resume);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [snapshot]);

  return now;
}

const weatherPreviewReadings: Record<TvWeatherMode, TvWeatherReading> = {
  clear: { temperature: 18, condition: "Clear", weatherCode: 0, cloudCover: 3, windSpeed: 7, windDirection: 240 },
  clouds: { temperature: 11, condition: "Cloudy", weatherCode: 3, cloudCover: 86, windSpeed: 18, windDirection: 275 },
  fog: { temperature: 4, condition: "Fog", weatherCode: 45, cloudCover: 100, windSpeed: 6, windDirection: 190 },
  rain: { temperature: 8, condition: "Rain", weatherCode: 63, cloudCover: 94, precipitation: 3.4, rain: 3.1, windSpeed: 27, windDirection: 285, windGusts: 42 },
  snow: { temperature: -8, condition: "Snow", weatherCode: 73, cloudCover: 100, precipitation: 2.1, snowfall: 2.3, windSpeed: 19, windDirection: 320 },
  storm: { temperature: 13, condition: "Thunderstorm", weatherCode: 95, cloudCover: 100, precipitation: 6.4, rain: 5.8, windSpeed: 35, windDirection: 250, windGusts: 58 }
};

function AppStoreMark() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="App Store">
      <path d="M8.8086 14.9194 14.9193 3.8826c.0837-.1513.1682-.302.2437-.4584.0685-.142.1267-.2854.1646-.4403.0803-.3259.0588-.6656-.066-.9767-.1238-.3095-.3417-.5678-.6201-.7355a1.4175 1.4175 0 0 0-.921-.1924c-.3207.043-.6135.1935-.8443.4288-.1094.1118-.1996.2361-.2832.369-.092.1463-.175.2979-.259.4492l-.3864.6979-.3865-.6979c-.0837-.1515-.1667-.303-.2587-.4492-.0837-.1329-.1739-.2572-.2835-.369-.2305-.2353-.5233-.3857-.844-.429a1.4181 1.4181 0 0 0-.921.1926c-.2784.1677-.4964.426-.6203.7355-.1246.311-.1461.6508-.066.9767.038.155.0962.2984.1648.4403.0753.1564.1598.307.2437.4584l1.248 2.2543-4.8625 8.7825H2.0295c-.1676 0-.3351-.0007-.5026.0092-.1522.009-.3004.0284-.448.0714-.3108.0906-.5822.2798-.7783.548-.195.2665-.3006.5929-.3006.9279 0 .3352.1057.6612.3006.9277.196.2683.4675.4575.7782.548.1477.043.296.0623.4481.0715.1675.01.335.009.5026.009h13.0974c.0171-.0357.059-.1294.1-.2697.415-1.4151-.6156-2.843-2.0347-2.843ZM3.113 18.5418l-.7922 1.5008c-.0818.1553-.1644.31-.2384.4705-.067.1458-.124.293-.1611.452-.0785.3346-.0576.6834.0645 1.0029.1212.3175.3346.583.607.7549.2727.172.5891.2416.9013.1975.3139-.044.6005-.1986.8263-.4402.1072-.1148.1954-.2424.2772-.3787.0902-.1503.1714-.3059.2535-.4612L6 19.4636c-.0896-.149-.9473-1.4704-2.887-.9218Zm20.5861-3.0056a1.4707 1.4707 0 0 0-.779-.5407c-.1476-.0425-.2961-.0616-.4483-.0705-.1678-.0099-.3352-.0091-.503-.0091H18.648l-4.3891-7.817c-.6655.7005-.9632 1.485-1.0773 2.1976-.1655 1.0333.0367 2.0934.546 3.0004l5.2741 9.3933c.084.1494.167.299.2591.4435.0837.131.1739.2537.2836.364.231.2323.5238.3809.8449.4232.3192.0424.643-.0244.9217-.1899.2784-.1653.4968-.4204.621-.7257.1246-.3072.146-.6425.0658-.9641-.0381-.1529-.0962-.2945-.165-.4346-.0753-.1543-.1598-.303-.2438-.4524l-1.216-2.1662h1.596c.1677 0 .3351.0009.5029-.009.1522-.009.3007-.028.4483-.0705a1.4707 1.4707 0 0 0 .779-.5407A1.5386 1.5386 0 0 0 24 16.452a1.539 1.539 0 0 0-.3009-.9158Z" />
    </svg>
  );
}

function GooglePlayMark() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Google Play">
      <path d="m22.018 13.298-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594ZM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924Zm12.207 10.065 3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973Zm0 2.067-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21Z" />
    </svg>
  );
}

function SocialMark({ platform }: { platform: "instagram" | "youtube" | "tiktok" }) {
  if (platform === "instagram") return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.1" y="3.1" width="17.8" height="17.8" rx="5.2" />
      <circle cx="12" cy="12" r="4.15" />
      <circle className={styles.socialDot} cx="17.45" cy="6.65" r="1.05" />
    </svg>
  );
  if (platform === "youtube") return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.6 7.15a3 3 0 0 0-2.11-2.12C17.62 4.5 12 4.5 12 4.5s-5.62 0-7.49.53A3 3 0 0 0 2.4 7.15 31 31 0 0 0 1.88 12a31 31 0 0 0 .52 4.85 3 3 0 0 0 2.11 2.12c1.87.53 7.49.53 7.49.53s5.62 0 7.49-.53a3 3 0 0 0 2.11-2.12 31 31 0 0 0 .52-4.85 31 31 0 0 0-.52-4.85Z" />
      <path className={styles.socialCutout} d="m9.75 15.35 5.55-3.35-5.55-3.35v6.7Z" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14.2 3.2v10.55a4.1 4.1 0 1 1-3.55-4.06v2.56a1.65 1.65 0 1 0 1.05 1.54V3.2h2.5Zm0 0c.33 2.3 1.64 3.69 4.05 4.05v2.5c-1.56-.08-2.9-.58-4.05-1.52V3.2Z" />
    </svg>
  );
}

function timeLabel(date: Date) {
  return calgaryTimeLabelFormatter.format(date);
}

function WeatherIcon({ mode }: { mode: TvWeatherMode }) {
  return <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {mode === "clear" ? <><circle cx="24" cy="24" r="9" /><path d="M24 4v5m0 30v5M4 24h5m30 0h5M10 10l4 4m20 20 4 4M10 38l4-4m20-20 4-4" /></> : <>
      <path d="M12 31a8 8 0 1 1 1-16 12 12 0 0 1 23 3 6.5 6.5 0 0 1 0 13H12Z" />
      {mode === "rain" ? <path d="m16 36-2 6m11-6-2 6m11-6-2 6" /> : null}
      {mode === "storm" ? <path d="m26 29-8 9h8l-4 8" /> : null}
      {mode === "snow" ? <path d="M17 36v8m-3-6 6 4m-6 0 6-4m13-2v8m-3-6 6 4m-6 0 6-4" /> : null}
      {mode === "fog" ? <path d="M8 37h32M12 43h24" /> : null}
    </>}
  </svg>;
}

function ClockArea({
  initialNow,
  displayWeather,
  showGregorianDate,
  showHijriDate,
  hijriDate
}: {
  initialNow: string;
  displayWeather: TvWeatherReading | null;
  showGregorianDate: boolean;
  showHijriDate: boolean;
  hijriDate?: string;
}) {
  const now = useAlignedClock(initialNow);

  return (
    <div className={styles.clockArea}>
      <div className={styles.clockRow}>
        {displayWeather ? (
          <div className={styles.weather} aria-label={`Calgary weather: ${displayWeather.temperature} degrees, ${displayWeather.condition}`}>
            <WeatherIcon mode={deriveWeatherVisualState(displayWeather).mode} />
            <b>{displayWeather.temperature < 0 ? "−" : ""}{Math.abs(displayWeather.temperature)}°C</b>
            <span><em>{displayWeather.condition}</em>{typeof displayWeather.windSpeed === "number" ? <small>Wind {Math.round(displayWeather.windSpeed)} km/h</small> : null}</span>
          </div>
        ) : null}
        <strong className={styles.clock}>{calgaryDigitalClockFormatter.format(now)}</strong>
      </div>
      {showGregorianDate ? <span className={styles.date}>{calgaryDateFormatter.format(now)}</span> : null}
      {showHijriDate && hijriDate ? <span className={styles.hijri}>{hijriDate}</span> : null}
    </div>
  );
}

const WeatherScene = memo(function WeatherScene({ weather }: { weather: TvWeatherVisualState }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const clouds = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const surface = canvas.current;
    const root = surface?.parentElement;
    if (surface && root && clouds.current) return startTvWeatherScene(surface, root, weather, clouds.current);
  }, [weather]);
  return <>
    <canvas ref={clouds} className={styles.cloudCanvas} aria-hidden="true" data-weather-clouds="cached" />
    <canvas ref={canvas} className={styles.weatherCanvas} aria-hidden="true" data-weather-surface="bounded" />
  </>;
});

const PrayerTile = memo(function PrayerTile({
  prayer,
  state,
  awaitingIqamah = false
}: {
  prayer: WidgetPrayerEntry;
  state: "passed" | "current" | "next" | "later";
  awaitingIqamah?: boolean;
}) {
  return (
    <div className={`${styles.prayerTile} ${styles[state]}`}>
      <div className={styles.prayerTileTop}>
        <span className={styles.prayerName}>
          {prayer.name}
          <small lang="ar" dir="rtl">{arabicPrayerNames[prayer.key]}</small>
        </span>
        {state === "next" ? <span className={styles.nextBadge}>{awaitingIqamah ? "Iqamah next" : "Next"}</span> : null}
      </div>
      <strong className={styles.adhanTime}>{awaitingIqamah ? prayer.iqamah : prayer.adhan}</strong>
      <span className={styles.iqamahTime}>
        {awaitingIqamah
          ? <>Adhan <b>{prayer.adhan}</b></>
          : prayer.iqamah
            ? <>Iqamah <b>{prayer.iqamah}</b></>
            : prayer.key === "sunrise" ? "Sunrise" : "—"}
      </span>
    </div>
  );
});

function LivePrayerSchedule({
  snapshot,
  previewJumuah,
  onJumuahThemeChange
}: {
  snapshot: TvDisplayPayload["snapshot"];
  previewJumuah: boolean;
  onJumuahThemeChange: (active: boolean) => void;
}) {
  const now = usePrayerScheduleClock(snapshot.generatedAt, snapshot);

  const focus = useMemo(() => deriveDisplayFocus(snapshot, now), [snapshot, now]);
  const currentKey = useMemo(() => deriveCurrentPrayerKey(snapshot, now), [snapshot, now]);
  const jumuahTheme = previewJumuah || isJumuahDisplayWindow(snapshot, now);
  const countdown = focus ? formatCountdown(focus.date, now) : "Schedule unavailable";

  useEffect(() => onJumuahThemeChange(jumuahTheme), [jumuahTheme, onJumuahThemeChange]);

  return (
    <>
      <section className={styles.hero} aria-label="Next prayer">
        {jumuahTheme ? (
          <div className={styles.jumuahOccasion} aria-label="The Day of Jumu’ah">
            <span lang="ar" dir="rtl">يَوْمُ الْجُمُعَةِ</span>
            <strong>The Day of Jumu’ah</strong>
          </div>
        ) : (
          <div className={styles.heroLabel}>{focus?.primaryKind === "iqamah" ? "Iqamah next" : "Next prayer"}</div>
        )}
        <div className={styles.heroPrayer}>
          <div className={styles.heroPrayerName}>
            <h2 data-weather-text>{focus?.entry.name ?? "Prayer times"}</h2>
            {focus ? <span lang="ar" dir="rtl">{arabicPrayerNames[focus.entry.key]}</span> : null}
          </div>
          <strong data-weather-text>{focus ? timeLabel(focus.date) : "Unavailable"}</strong>
        </div>
        <div className={styles.heroMeta}>
          <span className={styles.countdown}>{countdown}</span>
          {focus?.secondaryDate ? (
            <span className={styles.nextIqamah}>
              {focus.primaryKind === "iqamah" ? "Adhan" : "Iqamah"} <b>{timeLabel(focus.secondaryDate)}</b>
            </span>
          ) : null}
        </div>
      </section>

      <section className={styles.prayerGrid} aria-label="Today's prayer and iqamah times">
        {snapshot.prayers.map((prayer) => {
          const adhanMs = Date.parse(prayer.adhanDate);
          const awaitingIqamah = prayer.key === focus?.entry.key && focus.primaryKind === "iqamah";
          const state = prayer.key === focus?.entry.key
            ? "next"
            : prayer.key === currentKey
              ? "current"
              : adhanMs < now.getTime()
                ? "passed"
                : "later";
          return <PrayerTile key={prayer.key} prayer={prayer} state={state} awaitingIqamah={awaitingIqamah} />;
        })}
      </section>
    </>
  );
}

export function TvPrayerDisplay({ initialPayload }: { initialPayload: TvDisplayPayload }) {
  const [payload, setPayload] = useState(initialPayload);
  // Keep the atmospheric state on a relaxed cadence. Digital seconds
  // and the minute-resolution prayer schedule have separate timers below.
  const [now, setNow] = useState(() => new Date(initialPayload.snapshot.generatedAt));
  const [weather, setWeather] = useState<TvWeatherReading | null>(null);
  const [offline, setOffline] = useState(false);
  const [previewJumuah, setPreviewJumuah] = useState(false);
  const [jumuahTheme, setJumuahTheme] = useState(() => isJumuahDisplayWindow(
    initialPayload.snapshot,
    new Date(initialPayload.snapshot.generatedAt)
  ));
  const [previewWeather, setPreviewWeather] = useState<TvWeatherMode | null>(null);
  const [debugMetrics, setDebugMetrics] = useState<Record<string, string | number> | null>(null);
  const requestedServiceDate = useRef("");
  const acceptedPayload = useRef(initialPayload);
  const renderedPayloadSignature = useRef(displayRenderSignature(initialPayload));
  const displayInFlight = useRef(false);
  const weatherInFlight = useRef(false);
  const onJumuahThemeChange = useCallback((active: boolean) => {
    setJumuahTheme((current) => current === active ? current : active);
  }, []);

  const refreshDisplay = useCallback(async () => {
    if (document.visibilityState === "hidden" || displayInFlight.current) return;
    displayInFlight.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(publicDisplayUrl(), { signal: controller.signal });
      const data = await response.json() as TvDisplayPayload & { error?: string };
      if (!response.ok || data.ok !== true) throw new Error(data.error || "Display data unavailable");
      const receivedAt = new Date();
      if (!snapshotMatchesCalgaryDate(data.snapshot, receivedAt)) throw new Error("Daily schedule has not refreshed yet");
      if (preferCachedDisplay(data, acceptedPayload.current, receivedAt)) {
        setOffline(false);
        return;
      }
      const signature = displayRenderSignature(data);
      if (signature !== renderedPayloadSignature.current) {
        acceptedPayload.current = data;
        renderedPayloadSignature.current = signature;
        setPayload(data);
        writeLocalCache(cacheKey, JSON.stringify(data));
      }
      setOffline(false);
    } catch {
      setOffline(true);
    } finally {
      window.clearTimeout(timeout);
      displayInFlight.current = false;
    }
  }, []);

  const refreshWeather = useCallback(async () => {
    if (document.visibilityState === "hidden" || weatherInFlight.current) return;
    weatherInFlight.current = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch("/api/display/weather", { signal: controller.signal });
      const data = await response.json() as TvWeatherReading & { ok?: boolean };
      if (!response.ok || data.ok === false || typeof data.temperature !== "number") return;
      setWeather((current) => current && JSON.stringify(current) === JSON.stringify(data) ? current : data);
      writeLocalCache(weatherCacheKey, JSON.stringify(data));
    } catch {
      // Weather is optional and must never displace or interrupt prayer times.
    } finally {
      window.clearTimeout(timeout);
      weatherInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    document.body.classList.add("tv-display-active");
    const cached = readLocalCache(cacheKey);
    if (cached) {
      try {
        const value = JSON.parse(cached) as TvDisplayPayload;
        if (value.ok && value.snapshot?.prayers?.length && preferCachedDisplay(initialPayload, value, new Date())) {
          acceptedPayload.current = value;
          renderedPayloadSignature.current = displayRenderSignature(value);
          setPayload(value);
        } else {
          writeLocalCache(cacheKey, JSON.stringify(initialPayload));
        }
      } catch {
        removeLocalCache(cacheKey);
        writeLocalCache(cacheKey, JSON.stringify(initialPayload));
      }
    } else {
      writeLocalCache(cacheKey, JSON.stringify(initialPayload));
    }
    const cachedWeather = readLocalCache(weatherCacheKey);
    if (cachedWeather) {
      try {
        const value = JSON.parse(cachedWeather) as TvWeatherReading;
        if (typeof value.temperature === "number" && typeof value.condition === "string") setWeather(value);
      } catch {
        removeLocalCache(weatherCacheKey);
      }
    }
    return () => document.body.classList.remove("tv-display-active");
  }, [initialPayload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPreviewJumuah(params.get("previewJumuah") === "1");
    const requestedWeather = params.get("previewWeather") as TvWeatherMode | null;
    setPreviewWeather(requestedWeather && requestedWeather in weatherPreviewReadings ? requestedWeather : null);
    if (!params.has("debugDisplay")) return;
    const update = () => setDebugMetrics({
      userAgent: navigator.userAgent,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      visualWidth: Math.round(window.visualViewport?.width ?? window.innerWidth),
      visualHeight: Math.round(window.visualViewport?.height ?? window.innerHeight),
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      devicePixelRatio: window.devicePixelRatio,
      layout: window.innerHeight <= 600 ? "TV compact landscape" : window.innerWidth <= 1100 ? "TV narrow landscape" : "TV standard",
      build: initialPayload.contentVersion
    });
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [initialPayload.contentVersion]);

  useEffect(() => {
    const updateAtmosphereClock = () => {
      if (document.visibilityState !== "hidden") setNow(new Date());
    };
    const atmosphereClock = window.setInterval(updateAtmosphereClock, 30_000);
    const contentRefresh = window.setInterval(() => void refreshDisplay(), 60_000);
    const weatherRefresh = window.setInterval(() => void refreshWeather(), 15 * 60_000);
    const reconnect = () => {
      if (document.visibilityState === "hidden") return;
      setNow(new Date());
      void refreshDisplay();
      void refreshWeather();
    };
    window.addEventListener("online", reconnect);
    window.addEventListener("focus", reconnect);
    document.addEventListener("visibilitychange", reconnect);
    void refreshWeather();
    return () => {
      window.clearInterval(atmosphereClock);
      window.clearInterval(contentRefresh);
      window.clearInterval(weatherRefresh);
      window.removeEventListener("online", reconnect);
      window.removeEventListener("focus", reconnect);
      document.removeEventListener("visibilitychange", reconnect);
    };
  }, [refreshDisplay, refreshWeather]);

  useEffect(() => {
    if (snapshotMatchesCalgaryDate(payload.snapshot, now)) {
      requestedServiceDate.current = "";
      return;
    }
    const serviceDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: masjidTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(now);
    if (requestedServiceDate.current !== serviceDate) {
      requestedServiceDate.current = serviceDate;
      void refreshDisplay();
    }
  }, [now, payload.snapshot, refreshDisplay]);

  const atmosphere = useMemo(() => deriveDisplayAtmosphere(payload.snapshot, now), [payload.snapshot, now]);
  const displayWeather = previewWeather ? weatherPreviewReadings[previewWeather] : weather;
  const weatherVisual = useMemo(() => deriveWeatherVisualState(displayWeather), [displayWeather]);
  const weatherDrift = Math.sin((weatherVisual.windDirection + 180) * Math.PI / 180)
    * (8 + Math.min(18, weatherVisual.windSpeed * .35));
  const atmosphereStyle = {
    "--sky-top": atmosphere.skyTop,
    "--sky-middle": atmosphere.skyMiddle,
    "--sky-bottom": atmosphere.skyBottom,
    "--blue-glow": atmosphere.blueGlow,
    "--daylight": atmosphere.daylight.toFixed(3),
    "--sun-progress": atmosphere.sunProgress.toFixed(4),
    "--sun-altitude": atmosphere.sunAltitude.toFixed(4),
    "--sun-visibility": atmosphere.sunVisibility.toFixed(4),
    "--sun-warmth": atmosphere.sunWarmth.toFixed(4),
    "--sun-x": `${6 + atmosphere.sunProgress * 88}%`,
    "--sun-y": `${64 - atmosphere.sunAltitude * 40}%`,
    "--sun-weather-dim": weatherVisual.sunDimming.toFixed(3),
    "--sun-render-opacity": (atmosphere.sunVisibility * weatherVisual.sunDimming).toFixed(4),
    "--sun-overlay-opacity": (atmosphere.sunVisibility * weatherVisual.sunDimming * .72).toFixed(4),
    "--weather-intensity": weatherVisual.intensity.toFixed(3),
    "--weather-cloudiness": weatherVisual.cloudiness.toFixed(3),
    "--weather-cloud-opacity": (weatherVisual.cloudiness * .72).toFixed(3),
    "--weather-particle-opacity": (.15 + weatherVisual.intensity * .48).toFixed(3),
    "--weather-film-opacity": (weatherVisual.intensity * .62).toFixed(3),
    "--weather-motion-duration": `${weatherVisual.motionDuration.toFixed(1)}s`,
    "--weather-drift-x": `${weatherDrift.toFixed(2)}vw`,
    "--weather-half-drift-x": `${(weatherDrift * .46).toFixed(2)}vw`,
    "--weather-wind-lean": `${(Math.sin(weatherVisual.windDirection * Math.PI / 180) * Math.min(12, weatherVisual.windSpeed * .24)).toFixed(2)}deg`
  } as CSSProperties;
  const activeNotice = isDisplayAnnouncementActive(payload.display.announcement, now)
    ? payload.display.announcement.message.trim()
    : "";
  const youtube = socialHandle(payload.display.social.youtube);
  const instagram = socialHandle(payload.display.social.instagram);
  const tiktok = socialHandle(payload.display.social.tiktok);
  const launchTeaserActive = isAppLaunchTeaserActive(now);

  return (
    <main
      className={styles.display}
      data-hbic-publication-revision={payload.contentVersion}
      data-atmosphere={atmosphere.phase}
      data-jumuah={jumuahTheme ? "true" : "false"}
      data-weather={weatherVisual.mode}
      data-windy={weatherVisual.windy ? "true" : "false"}
      style={atmosphereStyle}
    >
      <div className={styles.daylightWash} aria-hidden="true" />
      <div className={styles.celestialField} aria-hidden="true">
        <div className={styles.sunAura} />
        <div className={styles.sunDisc}><span /></div>
      </div>
      {debugMetrics ? (
        <aside className={styles.debugPanel}>
          <strong>HBIC display diagnostics</strong>
          {Object.entries(debugMetrics).map(([key, value]) => <span key={key}>{key}: {value}</span>)}
        </aside>
      ) : null}
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoShell}>
            <Image src="/brand/hbic-logo.png" alt="Masjid Bilal" width={88} height={88} priority />
          </div>
          <div>
            <p>Hazrat Bilal Islamic Centre</p>
            <h1>{payload.display.title}</h1>
            <span>Calgary, Alberta</span>
          </div>
        </div>

        <ClockArea
          initialNow={initialPayload.snapshot.generatedAt}
          displayWeather={payload.display.showWeather ? displayWeather : null}
          showGregorianDate={payload.display.showGregorianDate}
          showHijriDate={payload.display.showHijriDate}
          hijriDate={payload.snapshot.hijriDate}
        />
      </header>

      <LivePrayerSchedule
        snapshot={payload.snapshot}
        previewJumuah={previewJumuah}
        onJumuahThemeChange={onJumuahThemeChange}
      />

      <section className={styles.secondary}>
        {payload.display.showJumuah && payload.snapshot.jumuahState.enabled ? (
          <div className={styles.jumuah}>
            <div className={styles.secondaryHeading}>
              <span lang={jumuahTheme ? "ar" : undefined} dir={jumuahTheme ? "rtl" : undefined}>
                {jumuahTheme ? "الجمعة" : "Jumu’ah"}
              </span>
              <small>Friday prayer</small>
            </div>
            <div className={styles.jumuahSessions}>
              {payload.snapshot.jumuahState.sessions.map((session, index) => (
                <div key={session.label}>
                  <span>{index === 0 ? "First khutbah" : "Second khutbah"}</span>
                  <strong>{session.khutbah}</strong>
                </div>
              ))}
            </div>
          </div>
        ) : <div />}

        {activeNotice ? (
          <div className={styles.notice}>
            <span>Masjid notice</span>
            <strong>{activeNotice}</strong>
          </div>
        ) : null}
      </section>

      <footer className={styles.footer}>
        <div className={styles.webIdentity}>
          {payload.display.showWebsite ? <strong>hbic.ca</strong> : null}
          {payload.display.showSocialLinks ? (
            <span className={styles.socialLinks}>
              {instagram ? <span aria-label={`Instagram ${instagram}`}><SocialMark platform="instagram" /><b>{instagram}</b></span> : null}
              {youtube ? <span aria-label={`YouTube ${youtube}`}><SocialMark platform="youtube" /><b>{youtube}</b></span> : null}
              {tiktok ? <span aria-label={`TikTok ${tiktok}`}><SocialMark platform="tiktok" /><b>{tiktok}</b></span> : null}
            </span>
          ) : null}
        </div>
        {offline ? <span className={styles.offline}>Using last confirmed schedule · reconnecting</span> : null}
        <div className={styles.contactLine}>
          <span>{payload.display.contact.address.replace(", Canada", "")}</span>
          <i aria-hidden="true">•</i>
          <span>{payload.display.contact.phone}</span>
        </div>
        {payload.display.showQrCode ? (
          launchTeaserActive ? (
            <div className={styles.launchTeaser} aria-label="Something big is coming. Scan to learn more on HBIC Youth Instagram.">
              <div className={styles.launchTeaserCopy}>
                <span>Something big</span>
                <strong>is coming</strong>
              </div>
              <svg className={styles.teaserArrow} viewBox="0 0 92 48" aria-hidden="true">
                <path d="M3 12c19 1 34 7 47 17 8 6 15 9 28 9" />
                <path d="m69 29 12 9-13 7" />
              </svg>
              <div className={styles.teaserQr}>
                <Image src="/brand/hbic-launch-teaser-qr.svg" alt="Scan to open HBIC Youth on Instagram" width={92} height={92} />
                <b>Scan to learn more</b>
              </div>
            </div>
          ) : (
            <div className={`${styles.launchDownloads} ${styles.smartDownloads}`} aria-label="Download the Masjid Bilal app today">
              <div className={styles.smartDownloadCopy}>
                <strong>Get the Masjid Bilal app</strong>
                <span><AppStoreMark /> iPhone <GooglePlayMark /> Android</span>
                <a href={appDownloadUrl}>hbic.ca/download</a>
              </div>
              <a className={styles.smartDownloadQr} href={appDownloadUrl}>
                <Image src={appDownloadQr} alt="Scan to download Masjid Bilal for iPhone or Android" width={592} height={592} unoptimized loading="eager" />
              </a>
            </div>
          )
        ) : null}
      </footer>
      <WeatherScene weather={weatherVisual} />
    </main>
  );
}
