import type { QuranMistake, QuranRecording } from "@hbic/shared";
export const reviewMarkerPageSize = 4;
/** Presentation only: keep every original item; no accuracy ranking. */
export function recentReviewItems<T extends QuranMistake | QuranRecording>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const date = (item: T) => Date.parse("lastDetectedAt" in item ? item.lastDetectedAt : item.createdAt);
    const difference = date(b) - date(a);
    return Number.isFinite(difference) && difference !== 0 ? difference : a.id.localeCompare(b.id);
  });
}
export function recordingReviewPoints(recording: QuranRecording, visible = reviewMarkerPageSize) {
  if (!Number.isSafeInteger(visible) || visible < 1 || visible > 100) throw new Error("Bounded review-point page required.");
  const markers = recording.markers ?? [];
  return { markers: markers.slice(0, visible), total: markers.length, remaining: Math.max(0, markers.length - visible), next: Math.min(100, visible + reviewMarkerPageSize) };
}
