/** Window-based layout works on phones, iPad, iOS-on-Mac and compatible Vision windows. */
import type { QuranMode } from "./types";

export function quranWorkspaceLayout(width: number, host: "mobile" | "mac" = "mobile") {
  const desktop = host === "mac";
  const sidebar = Number.isFinite(width) && width >= (desktop ? 780 : 1000);
  return { desktop, sidebar, sidebarWidth: sidebar ? desktop ? 224 : 260 : 0,
    inspector: desktop && Number.isFinite(width) && width >= 1280,
    readingWidth: desktop ? 920 : 840, horizontalPadding: width < 390 ? 14 : desktop ? 28 : 18 };
}

export function quranPrimaryMode(mode: QuranMode): "read" | "listen" | "practice" | "review" {
  if (["practice", "memorize", "test"].includes(mode)) return "practice";
  if (["review", "bookmarks"].includes(mode)) return "review";
  return mode === "listen" ? "listen" : "read";
}
