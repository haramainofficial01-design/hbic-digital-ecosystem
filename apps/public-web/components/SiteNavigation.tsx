"use client";

import type { MasjidSettings } from "@hbic/shared";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties } from "react";

const links = [
  ["App", "/app"],
  ["Prayer Times", "/prayer-times"],
  ["Events", "/events"],
  ["Media", "/media"],
  ["Donate", "/donate"],
  ["Programs", "/programs"],
  ["Youth", "/youth"],
  ["Community", "/community"],
  ["Muslim-Owned Businesses", "/halal-restaurants"],
  ["Contact", "/contact"],
  ["About", "/about"]
] as const;

type SliderStyle = CSSProperties & { opacity: number };

export function SiteNavigation({ settings }: { settings: MasjidSettings }) {
  const pathname = usePathname();
  const desktopRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [sliderStyle, setSliderStyle] = useState<SliderStyle>({ opacity: 0 });

  const isActive = useCallback((href: string) => pathname === href || pathname.startsWith(`${href}/`), [pathname]);

  const updateSlider = useCallback(() => {
    const activeLink = links.find(([, href]) => isActive(href));
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
  }, [isActive]);

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

  const navigationLinks = (mobile = false) => links.map(([label, href]) => (
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
        {navigationLinks()}
      </div>
      <div className="mobile-nav-actions">
        <Link
          className={`mobile-app-link${isActive("/app") ? " active" : ""}`}
          href="/app"
          aria-current={isActive("/app") ? "page" : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            beginNavigation("/app");
          }}
        >
          App
        </Link>
        <details className="mobile-menu" ref={mobileMenuRef}>
          <summary>Menu</summary>
          <div className="links mobile-links">{navigationLinks(true)}</div>
        </details>
      </div>
    </nav>
  );
}
