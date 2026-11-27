import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { isAppLaunchCampaignActive } from "../lib/appLaunch";
import { AppDownloadLink } from "./AppStoreLinks";
import { AppShowcaseIcon, AppShowcaseScreens } from "./AppShowcase";
import styles from "./AppShowcase.module.css";

export function AppLaunchPromotion() {
  if (!isAppLaunchCampaignActive()) return null;

  return (
    <section className={styles.home} aria-labelledby="app-home-promotion-title">
      <div className={styles.intro}>
        <AppShowcaseIcon />
        <h2 id="app-home-promotion-title">Masjid Bilal, <em>every day.</em></h2>
        <p>Check adhan and iqamah, read the Qur’an, and see what’s happening at the masjid.</p>
        <AppDownloadLink />
        <Link className={styles.exploreLink} href="/app">
          Explore the app <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <AppShowcaseScreens />
    </section>
  );
}
