import type { Firestore } from "firebase-admin/firestore";
import {
  dateStringInTimeZone,
  masjidTimeZone,
  normalizeContent,
  parseClock,
  isIqamahOverrideActive,
  prayerOrder,
  type HbicContent,
  type IqamahOverride,
  type IqamahPrayerName,
  type PrayerName
} from "@hbic/shared";
import { boundPrayerOverrides } from "./prayerOverrides";
import { iqamahCaAdhanUrl, parseIqamahCaAdhan } from "./iqamahCaAdhan";

const PRAYER_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const providerName = "Iqamah.ca" as const;

function configuredPrayerEndpoint() {
  // The retired AWS adapter/env overrides must never be contacted again.
  return iqamahCaAdhanUrl;
}

const CACHE_COLLECTION = "integrations";
const CACHE_DOC = "hbicOfficialPrayerTimes";

export type PrayerFeed = {
  salah_fajr?: string;
  salah_sunrise?: string;
  salah_zuhr?: string;
  salah_asr?: string;
  salah_maghrib?: string;
  salah_isha?: string;
  iqamah_fajr?: string;
  iqamah_zuhr?: string;
  iqamah_asr?: string;
  iqamah_maghrib?: string;
  iqamah_isha?: string;
  nw_i_fajr?: string;
  nw_i_zuhr?: string;
  nw_i_asr?: string;
  nw_i_maghrib?: string;
  nw_i_isha?: string;
  jummah?: string;
};

export type AdhanScheduleValues = Record<PrayerName, string>;
export type IqamahScheduleValues = Record<IqamahPrayerName, string>;

export interface ResolvedPrayerScheduleView {
  provider: typeof providerName;
  serviceDate: string;
  upcomingWeekEffective?: boolean;
  automatic: {
    adhan: AdhanScheduleValues;
    iqamah: IqamahScheduleValues;
    jumuah?: { first: string; second: string };
  };
  effective: {
    adhan: AdhanScheduleValues;
    iqamah: IqamahScheduleValues;
    jumuah: { first: string; second: string };
  };
  /** Next-week iqamah values supplied verbatim by the existing HBIC adapter. */
  upcomingWeek?: {
    iqamah: IqamahScheduleValues;
  };
}

export type PrayerSyncStatus = {
  configured: boolean;
  provider: typeof providerName;
  endpointHost: string;
  sourceState: "live" | "cached" | "unavailable";
  lastSuccessfulSync?: string;
  lastAttemptedSync?: string;
  lastError?: string;
  activeOverrides: IqamahPrayerName[];
  refreshIntervalMinutes: number;
  schedule?: ResolvedPrayerScheduleView;
};

type CachedPrayerSync = {
  feed?: PrayerFeed;
  normalizedContent?: Pick<HbicContent, "prayerTime" | "iqamahTime" | "jumuahSchedule">;
  serviceDate?: string;
  lastSuccessfulSync?: string;
  lastAttemptedSync?: string;
  lastError?: string | null;
  notificationBaseline?: HbicContent["iqamahTime"];
};

const iqamahFieldByPrayer: Record<IqamahPrayerName, `${IqamahPrayerName}Iqamah`> = {
  fajr: "fajrIqamah",
  dhuhr: "dhuhrIqamah",
  asr: "asrIqamah",
  maghrib: "maghribIqamah",
  isha: "ishaIqamah"
};

/** Only material iqamah changes are announced; daily adhan drift is not a change alert. */
export function changedIqamahTimes(previous: HbicContent["iqamahTime"] | undefined, current: HbicContent["iqamahTime"]) {
  if (!previous) return [] as { prayer: IqamahPrayerName; oldTime: string; newTime: string }[];
  return (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[])
    .filter((prayer) => previous[iqamahFieldByPrayer[prayer]] !== current[iqamahFieldByPrayer[prayer]])
    .map((prayer) => ({ prayer, oldTime: String(previous[iqamahFieldByPrayer[prayer]]), newTime: String(current[iqamahFieldByPrayer[prayer]]) }));
}

function endpointHost() {
  try {
    return new URL(configuredPrayerEndpoint()).host;
  } catch {
    return "configured endpoint";
  }
}

function normalizeTime(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/([0-9])([AP]M)$/i, "$1 $2")
    .replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

export function isOverrideActive(override?: IqamahOverride | null, now = new Date(), fallbackUpdatedAt?: string) {
  return isIqamahOverrideActive(override, now, fallbackUpdatedAt);
}

function isNextDynamicServerUsage(error: unknown) {
  if (!(error instanceof Error)) return false;
  const digest = "digest" in error ? String((error as Error & { digest?: unknown }).digest ?? "") : "";
  return digest.includes("DYNAMIC_SERVER_USAGE") || error.message.includes("Dynamic server usage:");
}

export function retainPrayerScheduleDuringOutage(content: HbicContent, nowDate = new Date()) {
  content = boundPrayerOverrides(content, undefined, nowDate);
  const now = nowDate.toISOString();
  const date = dateStringInTimeZone(nowDate, masjidTimeZone);
  const hasValidPublishedSchedule = prayerOrder.every((prayer) => Boolean(parseClock(content.prayerTime[prayer])));
  if (hasValidPublishedSchedule) {
    const overrides = content.iqamahTime.overrides ?? {};
    const active = (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[])
      .filter((prayer) => isOverrideActive(overrides[prayer], nowDate));
    const retainedIqamah = { ...content.iqamahTime };
    for (const prayer of Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]) {
      if (!overrides[prayer]?.enabled) continue;
      retainedIqamah[iqamahFieldByPrayer[prayer]] = active.includes(prayer)
        ? normalizeTime(overrides[prayer]!.value)
        : content.iqamahTime.automaticIqamah?.[prayer] ?? "";
    }
    return normalizeContent({
      ...content,
      prayerTime: {
        ...content.prayerTime,
        source: "Last confirmed Iqamah.ca schedule",
        calculationMethod: "Iqamah.ca temporarily unavailable; retained last confirmed public schedule"
      },
      iqamahTime: {
        ...retainedIqamah,
        upcomingWeekIqamah: undefined,
        source: "HBIC staff timetable",
        manualOverride: active.length > 0,
        adjustmentNotes: active.length ? "Active admin iqamah override." : ""
      }
    });
  }

  const overrides = content.iqamahTime.overrides ?? {};
  const activeOverrides = (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]).filter((prayer) =>
    isOverrideActive(overrides[prayer], nowDate, content.iqamahTime.updatedAt)
  );
  const overrideValue = (prayer: IqamahPrayerName) =>
    activeOverrides.includes(prayer) ? normalizeTime(overrides[prayer]?.value ?? "") : "";

  return normalizeContent({
    ...content,
    prayerTime: {
      ...content.prayerTime,
      date,
      fajr: "",
      sunrise: "",
      dhuhr: "",
      asr: "",
      maghrib: "",
      isha: "",
      source: "unavailable",
      sourceUrl: "",
      calculationMethod: "Unavailable",
      importedAt: undefined,
      lastUpdated: now
    },
    iqamahTime: {
      ...content.iqamahTime,
      upcomingWeekIqamah: undefined,
      date,
      fajrIqamah: overrideValue("fajr"),
      dhuhrIqamah: overrideValue("dhuhr"),
      asrIqamah: overrideValue("asr"),
      maghribIqamah: overrideValue("maghrib"),
      ishaIqamah: overrideValue("isha"),
      source: "unavailable",
      sourceUrl: "",
      manualOverride: activeOverrides.length > 0,
      adjustmentNotes: "",
      updatedAt: now
    }
  });
}

export function resolveEffectivePrayerSchedule(
  content: HbicContent,
  feed: PrayerFeed,
  sourceState: PrayerSyncStatus["sourceState"],
  serviceDate = dateStringInTimeZone(new Date(), masjidTimeZone),
  sourceUpdatedAt = new Date().toISOString(),
  now = new Date()
) {
  content = boundPrayerOverrides(content, undefined, now);
  const updatedAt = sourceUpdatedAt;
  const prayerTime = {
    ...content.prayerTime,
    date: serviceDate,
    fajr: normalizeTime(feed.salah_fajr ?? content.prayerTime.fajr),
    sunrise: normalizeTime(feed.salah_sunrise ?? content.prayerTime.sunrise),
    dhuhr: normalizeTime(feed.salah_zuhr ?? content.prayerTime.dhuhr),
    asr: normalizeTime(feed.salah_asr ?? content.prayerTime.asr),
    maghrib: normalizeTime(feed.salah_maghrib ?? content.prayerTime.maghrib),
    isha: normalizeTime(feed.salah_isha ?? content.prayerTime.isha),
    source: sourceState === "live" ? "Iqamah.ca" : "Iqamah.ca (last confirmed)",
    sourceUrl: "",
    calculationMethod: sourceState === "live" ? "Iqamah.ca HBIC schedule" : "Last confirmed Iqamah.ca HBIC schedule",
    importedAt: updatedAt,
    lastUpdated: updatedAt
  };

  // Adhan is automatic; iqamah belongs to HBIC staff, not IISC or the retired
  // AWS next-week feed. No weekly rollover is allowed to overwrite staff times.
  const automaticIqamah: IqamahScheduleValues = Object.fromEntries(
    (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]).map(prayer =>
      [prayer, content.iqamahTime[iqamahFieldByPrayer[prayer]]])
  ) as IqamahScheduleValues;

  const overrides = content.iqamahTime.overrides ?? {};
  const activeOverrides = (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]).filter((prayer) => isOverrideActive(overrides[prayer], now, content.iqamahTime.updatedAt));
  const iqamahTime = {
    ...content.iqamahTime,
    date: serviceDate,
    upcomingWeekIqamah: undefined,
    automaticIqamah,
    fajrIqamah: activeOverrides.includes("fajr") ? normalizeTime(overrides.fajr?.value ?? "") : automaticIqamah.fajr || content.iqamahTime.fajrIqamah,
    dhuhrIqamah: activeOverrides.includes("dhuhr") ? normalizeTime(overrides.dhuhr?.value ?? "") : automaticIqamah.dhuhr || content.iqamahTime.dhuhrIqamah,
    asrIqamah: activeOverrides.includes("asr") ? normalizeTime(overrides.asr?.value ?? "") : automaticIqamah.asr || content.iqamahTime.asrIqamah,
    maghribIqamah: activeOverrides.includes("maghrib") ? normalizeTime(overrides.maghrib?.value ?? "") : automaticIqamah.maghrib || content.iqamahTime.maghribIqamah,
    ishaIqamah: activeOverrides.includes("isha") ? normalizeTime(overrides.isha?.value ?? "") : automaticIqamah.isha || content.iqamahTime.ishaIqamah,
    source: "HBIC staff timetable",
    sourceUrl: "",
    manualOverride: activeOverrides.length > 0,
    adjustmentNotes: activeOverrides.length ? "Active admin iqamah override." : "",
    updatedAt
  };

  const jumuahSchedule = content.jumuahSchedule;

  const resolvedContent = normalizeContent({ ...content, prayerTime, iqamahTime, jumuahSchedule });
  const automaticAdhan: AdhanScheduleValues = {
    fajr: prayerTime.fajr,
    sunrise: prayerTime.sunrise,
    dhuhr: prayerTime.dhuhr,
    asr: prayerTime.asr,
    maghrib: prayerTime.maghrib,
    isha: prayerTime.isha
  };
  const effectiveIqamah: IqamahScheduleValues = {
    fajr: resolvedContent.iqamahTime.fajrIqamah,
    dhuhr: resolvedContent.iqamahTime.dhuhrIqamah,
    asr: resolvedContent.iqamahTime.asrIqamah,
    maghrib: resolvedContent.iqamahTime.maghribIqamah,
    isha: resolvedContent.iqamahTime.ishaIqamah
  };
  return {
    content: resolvedContent,
    activeOverrides,
    schedule: {
      provider: providerName,
      serviceDate,
      upcomingWeekEffective: false,
      upcomingWeek: undefined,
      automatic: { adhan: automaticAdhan, iqamah: automaticIqamah },
      effective: {
        adhan: automaticAdhan,
        iqamah: effectiveIqamah,
        jumuah: {
          first: resolvedContent.jumuahSchedule.firstIqamahTime,
          second: resolvedContent.jumuahSchedule.secondIqamahTime
        }
      },
    } satisfies ResolvedPrayerScheduleView
  };
}

async function fetchOfficialFeed(serviceDate: string): Promise<PrayerFeed> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const url = new URL(configuredPrayerEndpoint());
    url.searchParams.set("_hbicSync", String(Date.now()));
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "text/javascript", "cache-control": "no-cache" }
    });
    if (!response.ok) throw new Error(`Prayer source returned HTTP ${response.status}.`);
    return parseIqamahCaAdhan(await response.text(), serviceDate);
  } finally {
    clearTimeout(timeout);
  }
}

async function readCache(db: Firestore | null): Promise<CachedPrayerSync | null> {
  if (!db) return null;
  const snapshot = await db.collection(CACHE_COLLECTION).doc(CACHE_DOC).get();
  return snapshot.exists ? (snapshot.data() as CachedPrayerSync) : null;
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => stripUndefined(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .map(([entryKey, entryValue]) => [entryKey, stripUndefined(entryValue)])
    ) as T;
  }

  return value;
}

async function writeCache(db: Firestore | null, cache: CachedPrayerSync) {
  if (!db) return;
  await db.collection(CACHE_COLLECTION).doc(CACHE_DOC).set(stripUndefined(cache), { merge: true });
}

function cacheIsFresh(cache: CachedPrayerSync | null, serviceDate: string, now: Date) {
  if (!cache?.feed || cache.serviceDate !== serviceDate || !cache.lastAttemptedSync) return false;
  const attemptedAt = Date.parse(cache.lastAttemptedSync);
  return Number.isFinite(attemptedAt) && now.getTime() - attemptedAt < PRAYER_REFRESH_INTERVAL_MS;
}

export async function applyPrayerSync(
  content: HbicContent,
  db: Firestore | null,
  options: { force?: boolean; now?: Date; preview?: boolean } = {}
) {
  const nowDate = options.now ?? new Date();
  const now = nowDate.toISOString();
  const serviceDate = dateStringInTimeZone(nowDate, masjidTimeZone);
  const cached = await readCache(db);
  // Freeze the prior public iqamah for Sunday's notification comparison.
  // Public/draft reads never send visible alerts or advance this baseline.
  if (!options.preview && db && !cached?.notificationBaseline) {
    const ref = db.collection(CACHE_COLLECTION).doc(CACHE_DOC);
    await db.runTransaction(async tx => {
      const state = await tx.get(ref);
      if (!state.data()?.notificationBaseline) tx.set(ref, stripUndefined({
        notificationBaseline: cached?.normalizedContent?.iqamahTime ?? boundPrayerOverrides(content).iqamahTime
      }), { merge: true });
    });
  }

  let sourceState: PrayerSyncStatus["sourceState"] = "unavailable";
  let resolution: ReturnType<typeof resolveEffectivePrayerSchedule> | null = null;
  let synced = retainPrayerScheduleDuringOutage(content, nowDate);
  let lastError = cached?.lastError ?? undefined;
  let lastSuccessfulSync = cached?.lastSuccessfulSync;
  let lastAttemptedSync = cached?.lastAttemptedSync;

  if (!options.force && cacheIsFresh(cached, serviceDate, nowDate)) {
    sourceState = "cached";
    resolution = resolveEffectivePrayerSchedule(
      content,
      cached!.feed!,
      sourceState,
      serviceDate,
      cached!.lastSuccessfulSync ?? cached!.lastAttemptedSync ?? now,
      nowDate
    );
    synced = resolution.content;
  } else if (!options.force && !cached?.feed && cached?.lastError && cached.lastAttemptedSync &&
    nowDate.getTime() - Date.parse(cached.lastAttemptedSync) >= 0 &&
    nowDate.getTime() - Date.parse(cached.lastAttemptedSync) < PRAYER_REFRESH_INTERVAL_MS) {
    // An empty source cache used to retry the upstream on every request during
    // an outage. Retain the unavailable/stale state and the original attempt
    // timestamp, so this is a bounded retry delay, not a sliding indefinite one.
  } else {
    try {
      const feed = await fetchOfficialFeed(serviceDate);
      sourceState = "live";
      resolution = resolveEffectivePrayerSchedule(content, feed, sourceState, serviceDate, now, nowDate);
      synced = resolution.content;
      lastError = undefined;
      lastSuccessfulSync = now;
      lastAttemptedSync = now;
      try {
        await writeCache(db, {
          feed,
          serviceDate,
          ...(!options.preview ? { normalizedContent: {
            prayerTime: synced.prayerTime,
            iqamahTime: synced.iqamahTime,
            jumuahSchedule: synced.jumuahSchedule
          } } : {}),
          lastSuccessfulSync,
          lastAttemptedSync,
          lastError: null
        });
      } catch {
        // Live values are still authoritative for this response; cache persistence can recover later.
      }
    } catch (error) {
      if (isNextDynamicServerUsage(error)) throw error;
      lastError = error instanceof Error ? error.message : "Unable to refresh prayer data.";
      lastAttemptedSync = now;
      if (cached?.feed) {
        sourceState = "cached";
        resolution = resolveEffectivePrayerSchedule(
          content,
          cached.feed,
          sourceState,
          cached.serviceDate ?? cached.normalizedContent?.prayerTime.date ?? serviceDate,
          cached.lastSuccessfulSync ?? cached.lastAttemptedSync ?? now,
          nowDate
        );
        synced = resolution.content;
      } else if (cached?.normalizedContent) {
        sourceState = "cached";
        synced = retainPrayerScheduleDuringOutage(normalizeContent({
          ...content,
          prayerTime: cached.normalizedContent.prayerTime,
          iqamahTime: {
            ...cached.normalizedContent.iqamahTime,
            overrides: content.iqamahTime.overrides
          },
          jumuahSchedule: content.jumuahSchedule.manualOverride
            ? content.jumuahSchedule
            : cached.normalizedContent.jumuahSchedule
        }), nowDate);
      } else {
        sourceState = "unavailable";
        synced = retainPrayerScheduleDuringOutage(content, nowDate);
      }
      await writeCache(db, { lastAttemptedSync, lastError });
    }
  }

  if (!options.preview && changedIqamahTimes(cached?.normalizedContent?.iqamahTime, synced.iqamahTime).length) {
    if (sourceState === "cached") {
      try { await writeCache(db, { normalizedContent: {
        prayerTime: synced.prayerTime, iqamahTime: synced.iqamahTime, jumuahSchedule: synced.jumuahSchedule
      } }); } catch { /* The resolved public response remains authoritative. */ }
    }
  }

  const activeOverrides = resolution?.activeOverrides ?? (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]).filter((prayer) =>
    isOverrideActive(synced.iqamahTime.overrides?.[prayer], nowDate, content.iqamahTime.updatedAt)
  );

  const status: PrayerSyncStatus = {
    configured: true,
    provider: providerName,
    endpointHost: endpointHost(),
    sourceState,
    lastSuccessfulSync,
    lastAttemptedSync,
    lastError,
    activeOverrides,
    refreshIntervalMinutes: PRAYER_REFRESH_INTERVAL_MS / 60_000,
    schedule: resolution?.schedule
  };

  return { content: synced, status };
}

export async function getPrayerSyncStatus(content: HbicContent, db: Firestore | null) {
  const cached = await readCache(db);
  const now = new Date();
  const activeOverrides = (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]).filter((prayer) =>
    isOverrideActive(content.iqamahTime.overrides?.[prayer], now, content.iqamahTime.updatedAt)
  );
  const resolution = cached?.feed
    ? resolveEffectivePrayerSchedule(
        content,
        cached.feed,
        "cached",
        cached.serviceDate ?? dateStringInTimeZone(now, masjidTimeZone),
        cached.lastSuccessfulSync ?? cached.lastAttemptedSync ?? now.toISOString(),
        now
      )
    : null;

  return {
    configured: true,
    provider: providerName,
    endpointHost: endpointHost(),
    sourceState: cached?.lastSuccessfulSync ? "cached" : "unavailable",
    lastSuccessfulSync: cached?.lastSuccessfulSync,
    lastAttemptedSync: cached?.lastAttemptedSync,
    lastError: cached?.lastError ?? undefined,
    activeOverrides,
    refreshIntervalMinutes: PRAYER_REFRESH_INTERVAL_MS / 60_000,
    schedule: resolution?.schedule
  } satisfies PrayerSyncStatus;
}

export async function forcePrayerSync(content: HbicContent, db: Firestore | null) {
  return applyPrayerSync(content, db, { force: true });
}
