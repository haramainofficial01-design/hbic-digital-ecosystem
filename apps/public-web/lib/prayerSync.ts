import type { Firestore } from "firebase-admin/firestore";
import {
  dateStringInTimeZone,
  masjidTimeZone,
  normalizeContent,
  parseClock,
  prayerOrder,
  type HbicContent,
  type IqamahOverride,
  type IqamahPrayerName,
  type PrayerName
} from "@hbic/shared";

/** Existing HBIC-specific adapter supplied for the Iqamah.ca timetable. */
const DEFAULT_IQAMAH_CA_HBIC_ENDPOINT =
  "https://eyrn3ii2aj.execute-api.us-west-2.amazonaws.com/dev/hbic-update-times-dev-api";
const PRAYER_REFRESH_INTERVAL_MS = 5 * 60 * 1000;
const providerName = "Iqamah.ca" as const;

function configuredPrayerEndpoint() {
  const configured = (process.env.IQAMAH_CA_HBIC_SOURCE_URL || process.env.HBIC_PRAYER_SOURCE_URL)
    ?.trim()
    .replace(/^['"]|['"]$/g, "");
  if (!configured) return DEFAULT_IQAMAH_CA_HBIC_ENDPOINT;

  try {
    const parsed = new URL(configured);
    if (parsed.protocol === "https:") return parsed.href;
  } catch {
    // Ignore malformed deployment overrides and use the existing HBIC adapter.
  }

  return DEFAULT_IQAMAH_CA_HBIC_ENDPOINT;
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
};

const iqamahFieldByPrayer: Record<IqamahPrayerName, keyof HbicContent["iqamahTime"]> = {
  fajr: "fajrIqamah",
  dhuhr: "dhuhrIqamah",
  asr: "asrIqamah",
  maghrib: "maghribIqamah",
  isha: "ishaIqamah"
};

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

function parseClockToMinutes(value: string) {
  const match = normalizeTime(value).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (meridiem === "PM" && hour !== 12) hour += 12;
  if (meridiem === "AM" && hour === 12) hour = 0;
  return hour * 60 + minute;
}

function formatMinutesAsTime(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${meridiem}`;
}

function resolveIqamahValue(value: string | undefined, prayerValue: string) {
  if (!value) return "";
  const normalized = normalizeTime(value);
  const relative = normalized.match(/^\+(\d+)\s*MINS?$/i);
  if (!relative) return normalized;

  const base = parseClockToMinutes(prayerValue);
  if (base === null) return normalized;
  return formatMinutesAsTime(base + Number(relative[1]));
}

function parseJumuah(value: string | undefined) {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, "").toUpperCase();
  const [firstRaw, secondRaw] = normalized.split("/");
  if (!firstRaw || !secondRaw) return null;

  const secondMeridiem = secondRaw.endsWith("AM") ? "AM" : "PM";
  const first = normalizeTime(/[AP]M$/i.test(firstRaw) ? firstRaw : `${firstRaw}${secondMeridiem}`);
  const second = normalizeTime(secondRaw);
  return { first, second };
}

export function isOverrideActive(override?: IqamahOverride | null, now = new Date()) {
  if (!override?.enabled || !override.value?.trim()) return false;
  const nowTime = now.getTime();
  const startsAt = override.startsAt ? Date.parse(override.startsAt) : null;
  const endsAt = override.endsAt ? Date.parse(override.endsAt) : null;
  if (startsAt && nowTime < startsAt) return false;
  if (endsAt && nowTime > endsAt) return false;
  return true;
}

function isNextDynamicServerUsage(error: unknown) {
  if (!(error instanceof Error)) return false;
  const digest = "digest" in error ? String((error as Error & { digest?: unknown }).digest ?? "") : "";
  return digest.includes("DYNAMIC_SERVER_USAGE") || error.message.includes("Dynamic server usage:");
}

export function retainPrayerScheduleDuringOutage(content: HbicContent, nowDate = new Date()) {
  const now = nowDate.toISOString();
  const date = dateStringInTimeZone(nowDate, masjidTimeZone);
  const hasValidPublishedSchedule = prayerOrder.every((prayer) => Boolean(parseClock(content.prayerTime[prayer])));
  if (hasValidPublishedSchedule) {
    return normalizeContent({
      ...content,
      prayerTime: {
        ...content.prayerTime,
        source: "Last confirmed Iqamah.ca schedule",
        calculationMethod: "Iqamah.ca temporarily unavailable; retained last confirmed public schedule"
      },
      iqamahTime: {
        ...content.iqamahTime,
        source: "Last confirmed Iqamah.ca schedule",
        adjustmentNotes: content.iqamahTime.manualOverride ? "Active admin iqamah override." : ""
      }
    });
  }

  const overrides = content.iqamahTime.overrides ?? {};
  const activeOverrides = (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]).filter((prayer) =>
    isOverrideActive(overrides[prayer], nowDate)
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

  const baseIqamah = {
    fajr: resolveIqamahValue(feed.iqamah_fajr, prayerTime.fajr),
    dhuhr: resolveIqamahValue(feed.iqamah_zuhr, prayerTime.dhuhr),
    asr: resolveIqamahValue(feed.iqamah_asr, prayerTime.asr),
    maghrib: resolveIqamahValue(feed.iqamah_maghrib, prayerTime.maghrib),
    isha: resolveIqamahValue(feed.iqamah_isha, prayerTime.isha)
  };

  const overrides = content.iqamahTime.overrides ?? {};
  const activeOverrides = (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]).filter((prayer) => isOverrideActive(overrides[prayer], now));
  const iqamahTime = {
    ...content.iqamahTime,
    date: serviceDate,
    fajrIqamah: activeOverrides.includes("fajr") ? normalizeTime(overrides.fajr?.value ?? "") : baseIqamah.fajr || content.iqamahTime.fajrIqamah,
    dhuhrIqamah: activeOverrides.includes("dhuhr") ? normalizeTime(overrides.dhuhr?.value ?? "") : baseIqamah.dhuhr || content.iqamahTime.dhuhrIqamah,
    asrIqamah: activeOverrides.includes("asr") ? normalizeTime(overrides.asr?.value ?? "") : baseIqamah.asr || content.iqamahTime.asrIqamah,
    maghribIqamah: activeOverrides.includes("maghrib") ? normalizeTime(overrides.maghrib?.value ?? "") : baseIqamah.maghrib || content.iqamahTime.maghribIqamah,
    ishaIqamah: activeOverrides.includes("isha") ? normalizeTime(overrides.isha?.value ?? "") : baseIqamah.isha || content.iqamahTime.ishaIqamah,
    source: sourceState === "live" ? "Iqamah.ca" : "Iqamah.ca (last confirmed)",
    sourceUrl: "",
    manualOverride: activeOverrides.length > 0,
    adjustmentNotes: activeOverrides.length ? "Active admin iqamah override." : "",
    updatedAt
  };

  const jumuah = parseJumuah(feed.jummah);
  const jumuahSchedule = jumuah && !content.jumuahSchedule.manualOverride
    ? {
        ...content.jumuahSchedule,
        firstKhutbahTime: jumuah.first,
        firstIqamahTime: jumuah.first,
        secondKhutbahTime: jumuah.second,
        secondIqamahTime: jumuah.second,
        updatedAt
      }
    : content.jumuahSchedule;

  const resolvedContent = normalizeContent({ ...content, prayerTime, iqamahTime, jumuahSchedule });
  const automaticAdhan: AdhanScheduleValues = {
    fajr: prayerTime.fajr,
    sunrise: prayerTime.sunrise,
    dhuhr: prayerTime.dhuhr,
    asr: prayerTime.asr,
    maghrib: prayerTime.maghrib,
    isha: prayerTime.isha
  };
  const automaticIqamah: IqamahScheduleValues = baseIqamah;
  const upcomingWeekIqamah: IqamahScheduleValues = {
    fajr: normalizeTime(feed.nw_i_fajr ?? ""),
    dhuhr: normalizeTime(feed.nw_i_zuhr ?? ""),
    asr: normalizeTime(feed.nw_i_asr ?? ""),
    maghrib: normalizeTime(feed.nw_i_maghrib ?? ""),
    isha: normalizeTime(feed.nw_i_isha ?? "")
  };
  const hasUpcomingWeekIqamah = Object.values(upcomingWeekIqamah).some(Boolean);
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
      automatic: { adhan: automaticAdhan, iqamah: automaticIqamah, ...(jumuah ? { jumuah } : {}) },
      effective: {
        adhan: automaticAdhan,
        iqamah: effectiveIqamah,
        jumuah: {
          first: resolvedContent.jumuahSchedule.firstIqamahTime,
          second: resolvedContent.jumuahSchedule.secondIqamahTime
        }
      },
      ...(hasUpcomingWeekIqamah ? { upcomingWeek: { iqamah: upcomingWeekIqamah } } : {})
    } satisfies ResolvedPrayerScheduleView
  };
}

async function fetchOfficialFeed(): Promise<PrayerFeed> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const url = new URL(configuredPrayerEndpoint());
    url.searchParams.set("_hbicSync", String(Date.now()));
    const response = await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "application/json", "cache-control": "no-cache" }
    });
    if (!response.ok) throw new Error(`Prayer source returned HTTP ${response.status}.`);
    return (await response.json()) as PrayerFeed;
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
  options: { force?: boolean; now?: Date } = {}
) {
  const nowDate = options.now ?? new Date();
  const now = nowDate.toISOString();
  const serviceDate = dateStringInTimeZone(nowDate, masjidTimeZone);
  const cached = await readCache(db);

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
  } else {
    try {
      const feed = await fetchOfficialFeed();
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
          normalizedContent: {
            prayerTime: synced.prayerTime,
            iqamahTime: synced.iqamahTime,
            jumuahSchedule: synced.jumuahSchedule
          },
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
        synced = normalizeContent({
          ...content,
          prayerTime: cached.normalizedContent.prayerTime,
          iqamahTime: {
            ...cached.normalizedContent.iqamahTime,
            overrides: content.iqamahTime.overrides
          },
          jumuahSchedule: content.jumuahSchedule.manualOverride
            ? content.jumuahSchedule
            : cached.normalizedContent.jumuahSchedule
        });
      } else {
        sourceState = "unavailable";
        synced = retainPrayerScheduleDuringOutage(content, nowDate);
      }
      await writeCache(db, { lastAttemptedSync, lastError });
    }
  }

  const activeOverrides = resolution?.activeOverrides ?? (Object.keys(iqamahFieldByPrayer) as IqamahPrayerName[]).filter((prayer) =>
    isOverrideActive(synced.iqamahTime.overrides?.[prayer], nowDate)
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
    isOverrideActive(content.iqamahTime.overrides?.[prayer], now)
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
