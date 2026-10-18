"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { isAppLaunchCampaignActive } from "../lib/appLaunch";
import { AppDownloadLink } from "./AppStoreLinks";

function useCampaignActive() {
  // Keep the prerendered page and first client render identical; the effect
  // then applies the durable time gate without a hydration mismatch.
  const [active, setActive] = useState(false);

  useEffect(() => {
    const update = () => setActive(isAppLaunchCampaignActive());
    update();
    const timer = window.setInterval(update, 1_000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return active;
}

export function AppLaunchPromotion() {
  const active = useCampaignActive();
  if (!active) return null;

  return (
    <section className="section app-home-promotion" aria-labelledby="app-home-promotion-title">
      <div className="app-home-promotion-copy">
        <span className="eyebrow">THE MASJID BILAL APP</span>
        <h2 id="app-home-promotion-title">Your Masjid, wherever you are.</h2>
        <p>Prayer and iqamah times, community events, announcements and more—together in one place.</p>
        <AppDownloadLink />
        <a className="app-learn-link" href="/app">Explore the app <span aria-hidden="true">→</span></a>
      </div>
      <div className="app-home-device" aria-label="Masjid Bilal app preview">
        <Image src="/app/iphone-home.png" alt="Masjid Bilal app home screen showing the next prayer and iqamah time" width={1206} height={2622} />
        <span aria-hidden="true" />
      </div>
    </section>
  );
}
