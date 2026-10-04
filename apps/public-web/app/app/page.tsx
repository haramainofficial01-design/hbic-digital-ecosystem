import type { Metadata } from "next";
import Image from "next/image";
import { SiteChrome } from "../../components/SiteChrome";
import { StoreDownloadButtons } from "../../components/AppStoreLinks";
import { getPublishedPageContent as getPublishedContent } from "../../lib/contentStore";

export const metadata: Metadata = {
  title: "Masjid Bilal App | Hazrat Bilal Islamic Centre",
  description: "Download the official Masjid Bilal app for prayer and iqamah times, announcements, events and community updates.",
  alternates: { canonical: "/app" },
  openGraph: {
    title: "Your Masjid, Wherever You Are | Masjid Bilal App",
    description: "Stay connected with Masjid Bilal through prayer times, community events, announcements and more.",
    url: "https://hbic.ca/app",
    images: ["/brand/hbic-social-preview-v3.jpg"]
  }
};

const features = [
  {
    eyebrow: "Prayer & iqamah",
    title: "The official schedule, wherever the day takes you.",
    body: "See today’s adhan and iqamah times, the next prayer and Jumu’ah information from the same Masjid Bilal schedule used across HBIC.",
    image: "/app/android-prayer.png",
    alt: "Masjid Bilal Android prayer screen showing adhan, iqamah and the next prayer"
  },
  {
    eyebrow: "Community",
    title: "Stay close to what is happening at the masjid.",
    body: "Find current announcements, events, programs and community information without searching across separate channels.",
    image: "/app/android-community.png",
    alt: "Masjid Bilal Android community screen showing current masjid information"
  }
] as const;

export default async function AppPage() {
  const { content } = await getPublishedContent();

  return (
    <SiteChrome settings={content.settings} contentVersion={content.version}>
      <main className="app-landing-page">
        <section className="app-landing-hero" aria-labelledby="app-landing-title">
          <div className="app-landing-hero-copy">
            <div className="app-landing-identity">
              <Image src="/brand/hbic-logo.png" alt="Masjid Bilal" width={500} height={500} priority />
              <span><b>Masjid Bilal</b><small>Hazrat Bilal Islamic Centre · Calgary</small></span>
            </div>
            <span className="eyebrow">THE OFFICIAL MASJID BILAL APP</span>
            <h1 id="app-landing-title">Your Masjid,<br /><em>Wherever You Are.</em></h1>
            <p>Stay connected with Masjid Bilal through prayer and iqamah times, community events, announcements and more.</p>
            <StoreDownloadButtons showQr />
            <small className="app-verified-note">Official public downloads for iPhone and Android.</small>
          </div>
          <div className="app-landing-devices" aria-label="Masjid Bilal app on iPhone and Android">
            <div className="app-device app-device-ios">
              <Image src="/app/iphone-home.png" alt="Masjid Bilal iPhone home screen showing the next prayer and iqamah time" width={1206} height={2622} priority />
            </div>
            <div className="app-device app-device-android">
              <Image src="/app/android-prayer.png" alt="Masjid Bilal Android prayer screen showing today’s prayer and iqamah times" width={1080} height={1920} priority />
            </div>
          </div>
        </section>

        <section className="app-feature-intro" aria-labelledby="app-feature-title">
          <span className="eyebrow">MADE FOR OUR COMMUNITY</span>
          <h2 id="app-feature-title">The essentials, thoughtfully connected.</h2>
          <p>Everything shown here comes from the real Masjid Bilal app.</p>
        </section>

        <div className="app-feature-list">
          {features.map((feature, index) => (
            <section className={`app-feature${index % 2 ? " app-feature-reverse" : ""}`} key={feature.title}>
              <div className="app-feature-copy">
                <span>{feature.eyebrow}</span>
                <h2>{feature.title}</h2>
                <p>{feature.body}</p>
              </div>
              <div className="app-feature-screen">
                <Image src={feature.image} alt={feature.alt} width={1080} height={1920} />
              </div>
            </section>
          ))}
        </div>

        <section className="app-final-cta" aria-labelledby="app-final-title">
          <Image src="/brand/hbic-logo.png" alt="" width={500} height={500} />
          <span className="eyebrow">MASJID BILAL · CALGARY</span>
          <h2 id="app-final-title">Carry your masjid with you.</h2>
          <p>Download the official Masjid Bilal app today.</p>
          <StoreDownloadButtons showQr />
        </section>
      </main>
    </SiteChrome>
  );
}
