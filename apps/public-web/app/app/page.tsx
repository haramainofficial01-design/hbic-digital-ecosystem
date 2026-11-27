import type { Metadata } from "next";
import { SiteChrome } from "../../components/SiteChrome";
import { AppDownloadLink, StoreDownloadButtons } from "../../components/AppStoreLinks";
import { AppShowcaseIcon, AppShowcaseImage, AppShowcaseScreens } from "../../components/AppShowcase";
import styles from "../../components/AppShowcase.module.css";
import { getPublishedPageContent } from "../../lib/contentStore";

export const metadata: Metadata = {
  title: "Masjid Bilal App | Hazrat Bilal Islamic Centre",
  description: "Check Masjid Bilal’s prayer and iqamah times, read the Madinah Mushaf, and find local events. Download for iPhone and Android.",
  alternates: { canonical: "/app" },
  openGraph: {
    title: "Masjid Bilal, every day.",
    description: "Prayer times, the Madinah Mushaf, and life at Masjid Bilal. On iPhone and Android.",
    url: "https://hbic.ca/app",
    images: ["/brand/hbic-social-preview-v3.jpg"]
  }
};

export default async function AppPage() {
  const { content } = await getPublishedPageContent();

  return (
    <SiteChrome settings={content.settings} contentVersion={content.version}>
      <main className={styles.landing}>
        <section className={styles.hero} aria-labelledby="app-landing-title">
          <div className={styles.intro}>
            <AppShowcaseIcon />
            <h1 id="app-landing-title">Masjid Bilal, <em>every day.</em></h1>
            <p>Plan around adhan and iqamah, read the Qur’an, and stay close to your Calgary masjid.</p>
            <StoreDownloadButtons />
          </div>
          <AppShowcaseScreens priority />
        </section>

        <section className={styles.features} aria-labelledby="app-features-title">
          <h2 id="app-features-title">Prayer, Qur’an and community.</h2>
          <div className={styles.featureGrid}>
            <article className={styles.mushaf}>
              <div className={styles.featureCopy}>
                <h3>Read the Madinah Mushaf.</h3>
                <p>Read the 15-line Mushaf, listen to an ayah, or bookmark your place. Unfold an iPhone Duo to read facing pages together.</p>
              </div>
              <div className={styles.mushafScreen}><AppShowcaseImage screen="mushaf" /></div>
            </article>
            <article className={styles.prayer}>
              <div className={styles.featureCopy}>
                <h3>Know when to arrive.</h3>
                <p>See Masjid Bilal’s daily adhan and iqamah times, the next prayer, and Friday’s khutbah starts.</p>
              </div>
              <div className={styles.featureScreen}><AppShowcaseImage screen="prayer" /></div>
            </article>
            <article className={styles.events}>
              <div className={styles.featureCopy}>
                <h3>Find your next gathering.</h3>
                <p>Find Qur’an Academy classes, halaqas, youth programs, and announcements from the masjid.</p>
              </div>
              <div className={styles.featureScreen}><AppShowcaseImage screen="events" /></div>
            </article>
          </div>
        </section>

        <section className={styles.download} aria-labelledby="app-download-title">
          <h2 id="app-download-title">Get Masjid Bilal on your phone.</h2>
          <AppDownloadLink />
        </section>
      </main>
    </SiteChrome>
  );
}
