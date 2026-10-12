/** Window-based layout works on phones, iPad, iOS-on-Mac and compatible Vision windows. */
export function quranWorkspaceLayout(width: number) {
  const sidebar = Number.isFinite(width) && width >= 1000;
  return { sidebar, sidebarWidth: sidebar ? 260 : 0, readingWidth: 840, horizontalPadding: width < 390 ? 14 : 18 };
}
