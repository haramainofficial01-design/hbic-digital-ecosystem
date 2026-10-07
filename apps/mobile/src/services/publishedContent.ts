import { createWidgetPrayerSnapshot, normalizeContent, type HbicContent } from "@hbic/shared";
import * as FileSystem from "expo-file-system/legacy";
import { publishApplePrayerSnapshot } from "./applePrayerBridge";
import { publishWearPrayerSnapshot } from "./wearPrayerBridge";
import { reconcilePrayerNotificationsAsync } from "./notifications";

export interface CachedContentPayload {
  content: HbicContent;
  cachedAt: string;
}

const apiBase = (process.env.EXPO_PUBLIC_API_URL || "https://hbic.ca").replace(/\/$/, "");
export const publishedContentCacheFile = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}hbic-published-content.json`
  : "";

export async function readCachedPublishedContent(): Promise<CachedContentPayload | null> {
  if (!publishedContentCacheFile) return null;
  try {
    const info = await FileSystem.getInfoAsync(publishedContentCacheFile);
    if (!info.exists) return null;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(publishedContentCacheFile)) as Partial<HbicContent> | CachedContentPayload;
    const payload = "content" in parsed ? parsed as CachedContentPayload : null;
    const content = normalizeContent((payload?.content ?? parsed) as Partial<HbicContent>);
    return { content, cachedAt: payload?.cachedAt ?? content.updatedAt };
  } catch {
    return null;
  }
}

export async function fetchAndCachePublishedContent(): Promise<CachedContentPayload> {
  const response = await fetch(`${apiBase}/api/content/published`, { cache: "no-store" });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.content) throw new Error("Published content is unavailable.");

  const content = normalizeContent(data.content);
  const cachedAt = content.updatedAt || new Date().toISOString();
  const payload: CachedContentPayload = { content, cachedAt };
  if (publishedContentCacheFile) {
    const serialized = JSON.stringify(payload);
    const previous = await FileSystem.readAsStringAsync(publishedContentCacheFile).catch(() => "");
    if (previous !== serialized) await FileSystem.writeAsStringAsync(publishedContentCacheFile, serialized);
  }
  return payload;
}

export async function refreshPublishedContentInBackground() {
  const payload = await fetchAndCachePublishedContent();
  publishApplePrayerSnapshot(payload.content, { cached: false, refreshedAt: payload.cachedAt });
  publishWearPrayerSnapshot(payload.content, { cached: false, refreshedAt: payload.cachedAt });
  const snapshot = createWidgetPrayerSnapshot(payload.content, new Date(), {
    cached: false,
    refreshedAt: payload.cachedAt
  });
  await reconcilePrayerNotificationsAsync(snapshot);
  return payload;
}
