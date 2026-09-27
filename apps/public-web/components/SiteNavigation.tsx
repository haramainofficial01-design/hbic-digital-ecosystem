"use client";

import type { MasjidSettings } from "@hbic/shared";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

const primaryLinks = [
  ["Prayer Times", "/prayer-times"],
  ["App", "/app"],
  ["Events", "/events"],
  ["Donate", "/donate"],
  ["Programs", "/programs"],
  ["Youth", "/youth"]
] as const;

const secondaryLinks = [
  ["Media", "/media"],
  ["Community", "/community"],
  ["Muslim-Owned Businesses", "/halal-restaurants"],
  ["Contact", "/contact"],
  ["About", "/about"]
] as const;

const quranLink = ["Quran", "/quran"] as const;
const academyLink = ["Qur’an Academy", "/quran-academy"] as const;
const academyPrimaryLinks = [primaryLinks[0], academyLink, ...primaryLinks.slice(1, -1)] as const;
const academySecondaryLinks = [primaryLinks[primaryLinks.length - 1], ...secondaryLinks] as const;

const links = [...primaryLinks, ...secondaryLinks] as const;

type SliderStyle = CSSProperties & { opacity: number };

export function SiteNavigation({ settings, quranEnabled, academyEnabled }: { settings: MasjidSettings; quranEnabled: boolean; academyEnabled: boolean }) {
  const pathname = usePathname();
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [sliderStyle, setSliderStyle] = useState<SliderStyle>({ opacity: 0 });

  const isActive = useCallback((href: string) => pathname === href || pathname.startsWith(`${href}/`), [pathname]);

  const updateSlider = useCallback(() => {
    const activeLink = (academyEnabled ? academyPrimaryLinks : primaryLinks).find(([, href]) => isActive(href));
    const container = desktopRef.current;
    const element = activeLink ? linkRefs.current[activeLink[1]] : null;
    if (!container || !element) {
      setSliderStyle({ opacity: 0 });
      return;
    }

    setSliderStyle({
      opacity: 1,
      left: element.offsetLeft,
      top: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight
    });
  }, [academyEnabled, isActive]);

  useLayoutEffect(() => {
    updateSlider();
    const observer = new ResizeObserver(updateSlider);
    if (desktopRef.current) observer.observe(desktopRef.current);
    window.addEventListener("resize", updateSlider);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateSlider);
    };
  }, [updateSlider]);

  const beginNavigation = (href: string) => {
    if (!isActive(href)) window.dispatchEvent(new Event("masjid:navigate"));
    if (mobileMenuRef.current) mobileMenuRef.current.open = false;
  };

  const navigationLinks = (mobile = false, entries: readonly (readonly [string, string])[] = links) => entries.map(([label, href]) => (
    <Link
      key={href}
      href={href}
      ref={mobile ? undefined : (element) => { linkRefs.current[href] = element; }}
      className={isActive(href) ? "active" : undefined}
      aria-current={isActive(href) ? "page" : undefined}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        beginNavigation(href);
      }}
    >
      {label}
    </Link>
  ));

  return (
    <nav className="nav" aria-label="Main navigation">
      <Link
        className="brand"
        href="/"
        onClick={(event) => {
          if (pathname === "/") {
            event.preventDefault();
            window.dispatchEvent(new Event("masjid:blessing"));
          } else {
            beginNavigation("/");
          }
        }}
      >
        <Image src="/brand/hbic-logo.png" alt="" width={52} height={52} priority />
        <span>{settings.shortName}</span>
      </Link>
      <div className="links desktop-links nav-links" ref={desktopRef}>
        <span className="nav-slider" style={sliderStyle} aria-hidden="true" />
        {navigationLinks(false, academyEnabled ? academyPrimaryLinks : primaryLinks)}
        <details className="desktop-more-menu">
          <summary>Explore <span aria-hidden="true">⌄</span></summary>
          <div className="desktop-more-links">{navigationLinks(false, [...(quranEnabled ? [quranLink] : []), ...(academyEnabled ? academySecondaryLinks : secondaryLinks)])}</div>
        </details>
      </div>
      <div className="mobile-nav-actions">
        <Link
          className={`mobile-app-link${isActive("/prayer-times") ? " active" : ""}`}
          href="/prayer-times"
          aria-current={isActive("/prayer-times") ? "page" : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            beginNavigation("/prayer-times");
          }}
        >
          Prayer Times
        </Link>
        <details className="mobile-menu" ref={mobileMenuRef}>
          <summary>Menu</summary>
          <div className="links mobile-links">{navigationLinks(true, [...(academyEnabled ? academyPrimaryLinks : primaryLinks), ...(quranEnabled ? [quranLink] : []), ...(academyEnabled ? academySecondaryLinks : secondaryLinks)])}</div>
        </details>
      </div>
    </nav>
  );
}
