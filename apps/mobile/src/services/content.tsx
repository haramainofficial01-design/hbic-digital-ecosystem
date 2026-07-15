import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AppState } from "react-native";
import * as FileSystem from "expo-file-system";
import { defaultContent, normalizeContent, type HbicContent } from "@hbic/shared";
import { publishApplePrayerSnapshot } from "./applePrayerBridge";

type ContentSource = "api" | "cache" | "bundled-fallback";

interface CachedContentPayload {
  content: HbicContent;
  cachedAt: string;
}

interface PublishedContentContextValue {
  content: HbicContent;
  loading: boolean;
  source: ContentSource;
  lastUpdatedAt?: string;
  refreshError: string | null;
  refresh: () => Promise<void>;
}

const PublishedContentContext = createContext<PublishedContentContextValue | undefined>(undefined);
const apiBase = (process.env.EXPO_PUBLIC_API_URL || "https://hbic-calgary.vercel.app").replace(/\/$/, "");
const cacheFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-published-content.json` : "";
const foregroundRefreshMs = 60 * 1000;
const backgroundRefreshMs = 5 * 60 * 1000;

export function PublishedContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<HbicContent>(defaultContent);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<ContentSource>("bundled-fallback");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | undefined>();
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const lastRefreshRef = useRef(0);

  const loadCachedContent = useCallback(async () => {
    if (!cacheFile) return false;
    try {
      const info = await FileSystem.getInfoAsync(cacheFile);
      if (!info.exists) return false;
      const parsed = JSON.parse(await FileSystem.readAsStringAsync(cacheFile)) as Partial<HbicContent> | CachedContentPayload;
      const cachedPayload = "content" in parsed ? parsed : undefined;
      const cached = normalizeContent((cachedPayload?.content ?? parsed) as Partial<HbicContent>);
      setContent(cached);
      setSource("cache");
      setLastUpdatedAt(cachedPayload?.cachedAt ?? cached.updatedAt);
      return true;
    } catch {
      return false;
    }
  }, []);

  const refreshContent = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setLoading(true);
    setRefreshError(null);
    lastRefreshRef.current = Date.now();
    try {
      const response = await fetch(`${apiBase}/api/content/published`, { cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (response.ok && data?.content) {
        const nextContent = normalizeContent(data.content);
        const refreshedAt = nextContent.updatedAt || new Date().toISOString();
        setContent(nextContent);
        setSource("api");
        setLastUpdatedAt(refreshedAt);
        if (cacheFile) {
          const cachePayload: CachedContentPayload = { content: nextContent, cachedAt: refreshedAt };
          await FileSystem.writeAsStringAsync(cacheFile, JSON.stringify(cachePayload));
        }
      } else {
        setRefreshError("Couldn't refresh right now. Pull to try again.");
        const hadCache = await loadCachedContent();
        if (!hadCache) {
          setContent(defaultContent);
          setSource("bundled-fallback");
          setLastUpdatedAt(undefined);
        }
      }
    } catch {
      setRefreshError("Couldn't refresh right now. Pull to try again.");
      const hadCache = await loadCachedContent();
      if (!hadCache) {
        setContent(defaultContent);
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
