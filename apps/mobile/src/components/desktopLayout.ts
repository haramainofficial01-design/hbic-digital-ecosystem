/** Host-specific layout only. A wide iPad/phone/Vision window is not a Mac. */
export function desktopAppLayout(width: number, macHost: boolean, fontScale = 1) {
  const desktop = macHost && Number.isFinite(width) && width > 0;
  return {
    desktop,
    maxWidth: desktop ? 1120 : 1080,
    // Mac's native tab strip floats above the screen. Keep headings below it
    // even when UIKit reports a zero top safe-area inset.
    topPadding: desktop ? 64 : width >= 768 ? 24 : 16,
    columns: desktop && width >= 960 && Number.isFinite(fontScale) && fontScale <= 1.4 ? 2 : 1
  } as const;
}
