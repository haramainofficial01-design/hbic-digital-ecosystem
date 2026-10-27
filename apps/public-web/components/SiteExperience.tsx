"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { isJumuahDisplayWindow } from "../lib/tvDisplay";
import { fetchPublicDisplay } from "../lib/displayClient";

const blessings = [
  "May your visit bring benefit.",
  "May your day carry barakah.",
  "A quiet moment can reset the heart."
];

export function SiteExperience() {
  const pathname = usePathname();
  const router = useRouter();
  const [introVisible, setIntroVisible] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [blessing, setBlessing] = useState<string | null>(null);
  const [jumuahActive, setJumuahActive] = useState(false);
  const loaderFallback = useRef<number | null>(null);
  const blessingTimer = useRef<number | null>(null);
  const requestedVersion = useRef(0);

  useEffect(() => {
    if (pathname.startsWith("/display") || pathname === "/potluck") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion || window.sessionStorage.getItem("masjid-bilal-intro-seen")) return;

    window.sessionStorage.setItem("masjid-bilal-intro-seen", "true");
    setIntroVisible(true);
    const timer = window.setTimeout(() => setIntroVisible(false), 760);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/display") || pathname === "/potluck") return;
    const showLoader = () => {
      setRouteLoading(true);
      if (loaderFallback.current) window.clearTimeout(loaderFallback.current);
      loaderFallback.current = window.setTimeout(() => setRouteLoading(false), 1800);
    };
    const showBlessing = () => {
      const message = blessings[Math.floor(Date.now() / 1000) % blessings.length];
      setBlessing(message);
      if (blessingTimer.current) window.clearTimeout(blessingTimer.current);
      blessingTimer.current = window.setTimeout(() => setBlessing(null), 2600);
    };

    window.addEventListener("masjid:navigate", showLoader);
    window.addEventListener("masjid:blessing", showBlessing);
    return () => {
      window.removeEventListener("masjid:navigate", showLoader);
      window.removeEventListener("masjid:blessing", showBlessing);
      if (loaderFallback.current) window.clearTimeout(loaderFallback.current);
      if (blessingTimer.current) window.clearTimeout(blessingTimer.current);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/display") || pathname === "/potluck") return;
    const timer = window.setTimeout(() => setRouteLoading(false), 320);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (pathname.startsWith("/display") || pathname === "/potluck") return;
    let disposed = false;
    let inFlight = false;
    const checkPublishedVersion = async () => {
      if (disposed || inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/content/version");
        const data = await response.json().catch(() => null) as { publicationRevision?: number } | null;
        const rendered = Number(document.querySelector("[data-hbic-publication-revision]")?.getAttribute("data-hbic-publication-revision") ?? 0);
        const published = Number(data?.publicationRevision ?? 0);
        if (response.ok && published > rendered && published > requestedVersion.current) {
          requestedVersion.current = published;
          router.refresh();
        }
      } catch {
        // A brief network interruption should not disrupt the public site. The
        // next focus event or interval will retry the lightweight version check.
      } finally {
        inFlight = false;
      }
    };
    const onFocus = () => void checkPublishedVersion();
    const timer = window.setInterval(checkPublishedVersion, 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    void checkPublishedVersion();
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [pathname, router]);

  useEffect(() => {
    if (pathname.startsWith("/display") || pathname === "/potluck") return;
    let disposed = false;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const payload = await fetchPublicDisplay();
        if (!disposed) setJumuahActive(isJumuahDisplayWindow(payload.snapshot, new Date()));
      } catch {
        // Occasion styling is decorative and never interrupts public content.
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 60_000);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if ((pathname.startsWith("/display") || pathname === "/potluck") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let observer: IntersectionObserver | null = null;
    let frame = 0;
    const timer = window.setTimeout(() => {
      frame = window.requestAnimationFrame(() => {
        const elements = Array.from(document.querySelectorAll<HTMLElement>([
          ".page-hero",
          ".hero-panel",
          ".app-landing-hero",
          ".app-feature-intro",
          ".app-feature",
          ".app-final-cta",
          ".welcome-film-section > *",
          ".app-home-promotion > *",
          ".section > .card",
          ".section > .grid > *",
          ".directory-form-band",
          ".donation-invitation",
          ".follow-panel"
        ].join(",")));

        observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-visible");
            observer?.unobserve(entry.target);
          });
        }, { rootMargin: "0px 0px -7%", threshold: 0.08 });

        elements.forEach((element, index) => {
          element.classList.add("scroll-reveal");
          element.style.setProperty("--reveal-delay", `${Math.min(index % 4, 3) * 55}ms`);
          observer?.observe(element);
        });
      });
    }, 120);

    return () => {
      window.clearTimeout(timer);
      if (frame) window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [pathname]);

  const loaderVisible = introVisible || routeLoading;

  if (pathname.startsWith("/display") || pathname === "/potluck") return null;

  return (
    <>
      <div className={`jumuah-site-accent${jumuahActive ? " visible" : ""}`} aria-hidden={!jumuahActive}>
        <span lang="ar" dir="rtl">يَوْمُ الْجُمُعَةِ</span>
        <small>Yawm al-Jumu’ah</small>
      </div>
      <div className={`site-loader${loaderVisible ? " visible" : ""}`} aria-hidden={!loaderVisible}>
        <div className="site-loader-mark">
          <Image src="/brand/hbic-logo.png" alt="" width={58} height={58} priority />
        </div>
        <span className="site-loader-name">Masjid Bilal</span>
        <span className="sr-only" role="status">Loading Masjid Bilal</span>
      </div>
      <div className={`blessing-toast${blessing ? " visible" : ""}`} role="status" aria-live="polite">
        {blessing}
      </div>
    </>
  );
}
