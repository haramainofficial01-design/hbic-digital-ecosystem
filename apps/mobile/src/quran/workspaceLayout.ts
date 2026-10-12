/** Window-based layout works on phones, iPad, iOS-on-Mac and compatible Vision windows. */
import type { QuranMode } from "./types";

export function quranWorkspaceLayout(width: number) {
  const sidebar = Number.isFinite(width) && width >= 1000;
  return { sidebar, sidebarWidth: sidebar ? 260 : 0, readingWidth: 840, horizontalPadding: width < 390 ? 14 : 18 };
}

export function quranPrimaryMode(mode: QuranMode): "read" | "listen" | "practice" | "review" {
  if (["practice", "memorize", "test"].includes(mode)) return "practice";
  if (["review", "bookmarks"].includes(mode)) return "review";
  return mode === "listen" ? "listen" : "read";
}
