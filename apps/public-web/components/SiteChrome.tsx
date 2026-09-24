import { defaultContent, type MasjidSettings } from "@hbic/shared";
import Link from "next/link";
import { RouteContent } from "./RouteContent";
import { SiteNavigation } from "./SiteNavigation";
import { getPublicationState } from "../lib/publicationStore";

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
  return (
    <div
      className="site"
      data-hbic-content-version={contentVersion}
      data-hbic-publication-revision={publication.revision}
    >
      <SiteNavigation settings={settings} />
      <RouteContent>{children}</RouteContent>
      <footer className="footer">
        <div className="footer-inner">
          <strong>{settings.masjidName}</strong>
          <span>{settings.address}</span>
          <span>{settings.phone} · {settings.email}</span>
          <span>Prayer, programs, youth updates, donations, media, and community services from Masjid Bilal.</span>
          <div className="footer-links">
            <Link href="/privacy">Privacy Policy</Link>
            <Link href="/contact">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
