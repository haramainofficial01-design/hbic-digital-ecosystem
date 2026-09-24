import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import { createWidgetPrayerSnapshot, defaultContent, normalizeContent, type HbicContent } from "@hbic/shared";
import { publishApplePrayerSnapshot } from "./applePrayerBridge";
import { publishWearPrayerSnapshot } from "./wearPrayerBridge";
import { reconcilePrayerNotificationsAsync } from "./notifications";
import { fetchAndCachePublishedContent, readCachedPublishedContent } from "./publishedContent";

type ContentSource = "api" | "cache" | "bundled-fallback";

interface PublishedContentContextValue {
  content: HbicContent;
  loading: boolean;
  source: ContentSource;
  lastUpdatedAt?: string;
  refreshError: string | null;
  refresh: () => Promise<void>;
}

const PublishedContentContext = createContext<PublishedContentContextValue | undefined>(undefined);
const foregroundRefreshMs = 60 * 1000;
const backgroundRefreshMs = 5 * 60 * 1000;
const unavailableBundledContent = normalizeContent({
  ...defaultContent,
  prayerTime: {
    ...defaultContent.prayerTime,
    fajr: "",
    sunrise: "",
    dhuhr: "",
    asr: "",
    maghrib: "",
    isha: "",
    source: "unavailable",
    sourceUrl: "",
    calculationMethod: "Unavailable"
  },
  iqamahTime: {
    ...defaultContent.iqamahTime,
    fajrIqamah: "",
    dhuhrIqamah: "",
    asrIqamah: "",
    maghribIqamah: "",
    ishaIqamah: "",
    source: "unavailable",
    sourceUrl: "",
    manualOverride: false,
    adjustmentNotes: ""
  }
});

export function PublishedContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HbicContent>(unavailableBundledContent);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<ContentSource>("bundled-fallback");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const lastRefreshRef = useRef(0);

  const loadCachedContent = useCallback(async () => {
    const cachedPayload = await readCachedPublishedContent();
    if (cachedPayload) {
      setContent(cachedPayload.content);
      setSource("cache");
      setLastUpdatedAt(cachedPayload.cachedAt);
      return true;
    }
    return false;
  }, []);

  const refreshContent = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    setRefreshError(null);
    lastRefreshRef.current = Date.now();
    try {
      const payload = await fetchAndCachePublishedContent();
      setContent(payload.content);
      setSource("api");
      setLastUpdatedAt(payload.cachedAt);
    } catch {
      setRefreshError("Couldn't refresh right now. Pull to try again.");
      const hadCache = await loadCachedContent();
      if (!hadCache) {
        setContent(unavailableBundledContent);
        setSource("bundled-fallback");
        setLastUpdatedAt(undefined);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [loadCachedContent]);

  const refresh = useCallback(() => refreshContent(), [refreshContent]);

  useEffect(() => {
    void loadCachedContent().finally(() => refreshContent());
  }, [loadCachedContent, refreshContent]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() - lastRefreshRef.current > foregroundRefreshMs) {
        void refreshContent({ silent: true });
      }
    });

    return () => subscription.remove();
  }, [refreshContent]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (AppState.currentState === "active") void refreshContent({ silent: true });
    }, backgroundRefreshMs);

    return () => clearInterval(interval);
  }, [refreshContent]);

  useEffect(() => {
    if (loading || source === "bundled-fallback") return;
    publishApplePrayerSnapshot(content, {
      cached: source === "cache",
      refreshedAt: lastUpdatedAt
    });
    publishWearPrayerSnapshot(content, {
      cached: source === "cache",
      refreshedAt: lastUpdatedAt
    });
    const snapshot = createWidgetPrayerSnapshot(content, new Date(), {
      cached: source === "cache",
      refreshedAt: lastUpdatedAt
    });
    void reconcilePrayerNotificationsAsync(snapshot).catch((error) => {
      if (__DEV__) console.warn("Masjid Bilal prayer alerts could not be reconciled.", error);
    });
  }, [content, lastUpdatedAt, loading, source]);

  const value = useMemo(
    () => ({ content, loading, refresh, source, lastUpdatedAt, refreshError }),
    [content, lastUpdatedAt, loading, refresh, refreshError, source]
  );

  return <PublishedContentContext.Provider value={value}>{children}</PublishedContentContext.Provider>;
}

export function usePublishedContent() {
  const value = useContext(PublishedContentContext);
  if (!value) throw new Error("usePublishedContent must be used inside PublishedContentProvider");
  return value;
}
