import type { CSSProperties } from "react";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";

export const revalidate = 300;

export default async function AboutPage() {
  const { content } = await getPublishedContent();

  return (
    <SiteChrome settings={content.settings} contentVersion={content.version}>
      <section className="section">
        <div className="page-hero" style={{ "--hero-image": "url('/photos/masjid-exterior.png')" } as CSSProperties}>
          <span className="eyebrow">About HBIC</span>
          <h2>Hazrat Bilal Islamic Centre</h2>
          <p>Serving the Calgary Muslim community through prayer, education, youth programs, sisters&apos; programs, community services, reminders, and beneficial Islamic learning.</p>
          <div className="stat-row">
            <span className="stat-pill">Established 2014</span>
            <span className="stat-pill">Registered Charity</span>
            <span className="stat-pill">#806888830 RR 0001</span>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid">
          <div className="card full">
            <span className="kicker">Community</span>
            <h3>Serving Calgary since 2014</h3>
            <p className="muted">Hazrat Bilal Islamic Centre (HBIC)&reg; is a registered charitable and non-profit organization (#806888830 RR 0001) based in Calgary, Alberta, Canada.</p>
            <p className="muted">Established in 2014, HBIC serves the Muslim community through prayer, education, youth programs, sisters&apos; programs, community services, reminders, and beneficial Islamic learning.</p>
          </div>
          <div className="card wide">
            <span className="kicker">Mission</span>
            <h3>Qur&apos;an and Sunnah</h3>
            <p className="muted">Hazrat Bilal Islamic Centre does not represent any political organization, does not belong to any da&apos;wah group or sect, and does not blindly follow any madhhab. Rather, it seeks to follow, with knowledge, the clear guidance of the Qur&apos;an and Sunnah upon the understanding of the Companions of the Prophet ﷺ and those who followed them.</p>
          </div>
          <div className="card wide gold">
            <span className="kicker">Name</span>
            <h3>Bilal ibn Rabah رضي الله عنه</h3>
            <p className="muted">The organization is named after the beloved Companion and first mu&apos;adhdhin of Prophet Muhammad ﷺ, Bilal ibn Rabah رضي الله عنه.</p>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
