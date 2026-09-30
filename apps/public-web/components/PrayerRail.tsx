"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { CloudMoon, CloudSun, Minimize2, MoonStar, Sun, Sunset, type LucideIcon } from "lucide-react";
import { deriveDisplayFocus, snapshotMatchesCalgaryDate, type TvDisplayPayload } from "../lib/tvDisplay";

const names = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const prayerIcons: Record<string, LucideIcon> = { fajr: CloudMoon, dhuhr: Sun, asr: CloudSun, maghrib: Sunset, isha: MoonStar };

function countdown(target: Date, now: Date) {
  const minutes = Math.max(0, Math.ceil((target.getTime() - now.getTime()) / 60_000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m` : `${minutes}m`;
}

export function PrayerRail() {
  const path = usePathname();
  const [payload, setPayload] = useState<TvDisplayPayload | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [open, setOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const hidden = path === "/prayer-times" || path.startsWith("/display");

  useEffect(() => {
    if (hidden) return;
    let disposed = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const response = await fetch(`/api/display?rail=${Date.now()}`, { cache: "no-store" });
        const data = await response.json() as TvDisplayPayload;
        if (!disposed && response.ok && data.ok) setPayload(data);
      } catch { /* Keep the prior snapshot until the next retry. */ }
    };
    void refresh();
    const timer = window.setInterval(() => { setNow(new Date()); void refresh(); }, 60_000);
    const onFocus = () => { setNow(new Date()); void refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [hidden]);

  if (hidden || !payload || !snapshotMatchesCalgaryDate(payload.snapshot, now) || payload.snapshot.availability !== "available") return null;
  const focus = deriveDisplayFocus(payload.snapshot, now);
  if (!focus) return null;
  const CurrentPrayerIcon = prayerIcons[focus.entry.key] ?? MoonStar;
  const entries = payload.snapshot.prayers.filter((entry) => names.includes(entry.key));
  const nextLabel = `${focus.entry.name} ${focus.primaryKind === "iqamah" ? "iqamah" : "adhan"}`;
  return <>
    <div className={`prayer-glass-bar${desktopCollapsed ? " is-collapsed" : ""}`} role="region" aria-label="Live prayer times">
      <button type="button" className="prayer-glass-toggle" aria-expanded={!desktopCollapsed} aria-controls="desktop-prayer-times" aria-label={desktopCollapsed ? "Show live prayer times" : "Minimize live prayer times"} title={desktopCollapsed ? "Show prayer times" : "Minimize prayer times"} onClick={() => setDesktopCollapsed(!desktopCollapsed)}>
        {desktopCollapsed ? <CurrentPrayerIcon size={21} strokeWidth={1.9} aria-hidden="true" /> : <Minimize2 size={20} strokeWidth={1.9} aria-hidden="true" />}
      </button>
      <div id="desktop-prayer-times" className="prayer-glass-content" aria-hidden={desktopCollapsed} inert={desktopCollapsed}>
        <span className="prayer-glass-next"><strong>Next: {nextLabel}</strong><span>{countdown(focus.date, now)}</span></span>
        <span className="prayer-glass-times">{entries.map((entry) => <span key={entry.key}><b>{entry.name}</b> <time>{entry.adhan}</time>{entry.iqamah ? <small> · Iqamah <time>{entry.iqamah}</time></small> : null}</span>)}</span>
        <Link href="/prayer-times" aria-label="Open complete prayer and iqamah times">Full times ↗</Link>
      </div>
    </div>
    <div className={`prayer-mobile-rail${open ? " is-open" : ""}`} role="region" aria-label="Live prayer times">
      <button type="button" className="prayer-mobile-toggle" aria-expanded={open} aria-controls="prayer-mobile-panel" onClick={() => setOpen(!open)}>
        <CurrentPrayerIcon size={23} strokeWidth={1.8} aria-hidden="true" /><small>{open ? "Close" : focus.entry.name}</small>
      </button>
      <div id="prayer-mobile-panel" className="prayer-mobile-panel" aria-hidden={!open} inert={!open}>
        <strong>Next {nextLabel}</strong><span>{countdown(focus.date, now)} remaining</span>
        <ul>{entries.map((entry) => <li key={entry.key}><b>{entry.name}</b><span><time>{entry.adhan}</time>{entry.iqamah ? <small>Iqamah <time>{entry.iqamah}</time></small> : null}</span></li>)}</ul>
        <Link href="/prayer-times" onClick={() => setOpen(false)}>Full prayer times ↗</Link>
      </div>
    </div>
  </>;
}
