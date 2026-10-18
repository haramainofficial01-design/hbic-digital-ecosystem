import { defaultContent, type MasjidSettings } from "@hbic/shared";
import Link from "next/link";
import { RouteContent } from "./RouteContent";
import { SiteNavigation } from "./SiteNavigation";
import { getPublicationState } from "../lib/publicationStore";
import { isQuranPublicEnabled } from "../lib/quranRelease";
import { PrayerRail } from "./PrayerRail";
import { BilalCompanion } from "./BilalCompanion";
import { AppDownloadLink } from "./AppStoreLinks";

export async function SiteChrome({
  children,
  settings = defaultContent.settings,
  contentVersion = defaultContent.version
}: {
  children: React.ReactNode;
  settings?: MasjidSettings;
  contentVersion?: number;
}) {
  const publication = await getPublicationState();
  const quranEnabled = isQuranPublicEnabled();
  const academyEnabled = process.env.ACADEMY_PREVIEW_ENABLED === "true";
  return (
    <><div
      className="site"
      data-hbic-content-version={contentVersion}
      data-hbic-publication-revision={publication.revision}
    >
      <SiteNavigation settings={settings} quranEnabled={quranEnabled} academyEnabled={academyEnabled} />
      <PrayerRail />
      <RouteContent>{children}</RouteContent>
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-intro"><span className="footer-eyebrow">HAZRAT BILAL ISLAMIC CENTRE</span><strong>{settings.masjidName}</strong><p>Prayer, learning, youth and community in Calgary.</p></div>
          <div className="footer-contact"><span>VISIT & CONNECT</span><a href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`} target="_blank" rel="noreferrer">{settings.address}</a><a href={`tel:${settings.phone}`}>{settings.phone}</a><a href={`mailto:${settings.email}`}>{settings.email}</a></div>
          <div className="footer-links">
            <Link href="/prayer-times">Prayer Times</Link>
            <Link href="/events">Events</Link>
            <Link href="/programs">Programs</Link>
            {academyEnabled ? <Link href="/quran-academy">Qur’an Academy</Link> : null}
            {quranEnabled ? <Link href="/quran">Quran</Link> : null}
            <Link href="/app">The App</Link>
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/contact">Contact</Link>
          </div>
          <div className="footer-download"><AppDownloadLink /></div>
          <small className="footer-bottom">© {new Date().getFullYear()} Hazrat Bilal Islamic Centre · Made for our community.</small>
        </div>
      </footer>
    </div><BilalCompanion /></>
  );
}
