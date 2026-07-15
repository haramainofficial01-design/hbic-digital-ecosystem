import { createWidgetPrayerSnapshot, type HbicContent } from "@hbic/shared";
import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface MasjidAppleBridgeModule {
  updatePrayerSnapshot(json: string): boolean;
  readPrayerSnapshot(): string | null;
  isWatchSupported(): boolean;
}

const nativeBridge = Platform.OS === "ios"
  ? requireOptionalNativeModule<MasjidAppleBridgeModule>("MasjidAppleBridge")
  : null;

export function publishApplePrayerSnapshot(
  content: HbicContent,
  options: { cached: boolean; refreshedAt?: string }
) {
  if (!nativeBridge) return false;
  const snapshot = createWidgetPrayerSnapshot(content, new Date(), {
    cached: options.cached,
    refreshedAt: options.refreshedAt
  });

  try {
    return nativeBridge.updatePrayerSnapshot(JSON.stringify(snapshot));
  } catch {
    return false;
  }
}
