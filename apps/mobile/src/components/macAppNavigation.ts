export const macAppDestinations = [
  { href: "/", label: "Home", icon: "home-outline" },
  { href: "/prayer", label: "Prayer", icon: "time-outline" },
  { href: "/quran", label: "Quran", icon: "book-outline" },
  { href: "/quran-academy", label: "Quran Academy", icon: "school-outline" },
  { href: "/events", label: "Events", icon: "calendar-outline" },
  { href: "/donate", label: "Donate", icon: "heart-outline" },
  { href: "/more", label: "More", icon: "grid-outline" },
  { href: "/settings", label: "Settings", icon: "settings-outline" }
] as const;

export function selectedMacDestination(pathname: string) {
  return macAppDestinations.find(item => pathname === item.href || item.href !== "/" && pathname.startsWith(`${item.href}/`))?.href ?? "/more";
}

export function macWindowLayout(width: number, fontScale = 1, collapsed = false) {
  const compact = collapsed || !Number.isFinite(width) || width < 1060 || !Number.isFinite(fontScale) || fontScale > 1.4;
  return { compact, sidebarWidth: compact ? 76 : 232 };
}
