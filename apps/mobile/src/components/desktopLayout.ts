/** Host-specific layout only. A wide iPad/phone/Vision window is not a Mac. */
export function desktopAppLayout(width: number, macHost: boolean, fontScale = 1) {
  const desktop = macHost && Number.isFinite(width) && width > 0;
  return {
    desktop,
    maxWidth: desktop ? 1120 : 1080,
    // Mac navigation lives in its own sidebar, outside the content pane.
    topPadding: desktop ? 28 : width >= 768 ? 24 : 16,
    columns: desktop && width >= 960 && Number.isFinite(fontScale) && fontScale <= 1.4 ? 2 : 1
  } as const;
}
