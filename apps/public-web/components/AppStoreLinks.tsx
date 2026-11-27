import Image from "next/image";
import { appDownloadQr, appDownloadUrl, appLaunchCampaign } from "../lib/appLaunch";

export function AppDownloadLink() {
  return <div className="smart-app-download">
    <div className="smart-app-copy">
      <a className="app-store-button app-smart-button" href={appDownloadUrl} aria-label="Download Masjid Bilal for iPhone or Android">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span><small>iPhone &amp; Android</small><strong>Get the app</strong></span>
      </a>
      <a className="app-smart-url" href={appDownloadUrl}>hbic.ca/download</a>
    </div>
    <a className="app-smart-qr-link" href={appDownloadUrl} aria-label="Open the Masjid Bilal app download link">
      <Image className="app-smart-qr" src={appDownloadQr} alt="Scan to download Masjid Bilal for iPhone or Android" width={592} height={592} sizes="112px" unoptimized />
    </a>
  </div>;
}

export function StoreDownloadButtons({ showQr = false }: { showQr?: boolean }) {
  return (
    <div className="app-download-options">
      {showQr ? <AppDownloadLink /> : null}
      <div className="app-store-links">
        <a className="app-store-badge" href={appLaunchCampaign.appStoreUrl} target="_blank" rel="noreferrer" aria-label="Download Masjid Bilal on the Apple App Store">
          <Image src="/app/badge-app-store.svg" alt="" width={120} height={40} unoptimized />
        </a>
        <a className="app-store-badge" href={appLaunchCampaign.googlePlayUrl} target="_blank" rel="noreferrer" aria-label="Get Masjid Bilal on Google Play">
          <Image src="/app/badge-google-play.png" alt="" width={134} height={40} unoptimized />
        </a>
      </div>
    </div>
  );
}
