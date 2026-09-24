import Image from "next/image";
import { appLaunchCampaign } from "../lib/appLaunch";

export function AppleStoreMark() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Apple App Store">
      <path d="M8.81 14.92 14.92 3.88c.08-.15.17-.3.24-.46.07-.14.13-.29.17-.44.08-.33.06-.67-.07-.98a1.48 1.48 0 0 0-.62-.73 1.42 1.42 0 0 0-.92-.2c-.32.05-.61.2-.84.44-.11.11-.2.23-.29.37-.09.14-.17.3-.25.45l-.39.7-.39-.7c-.08-.15-.16-.31-.25-.45a1.8 1.8 0 0 0-.29-.37 1.39 1.39 0 0 0-.84-.44 1.42 1.42 0 0 0-.92.2c-.28.16-.5.42-.62.73-.12.31-.15.65-.07.98.04.15.1.3.17.44.07.16.16.31.24.46l1.25 2.25-4.86 8.79H2.03c-.17 0-.34 0-.5.01-.16 0-.3.03-.45.07-.31.09-.58.28-.78.55-.2.27-.3.59-.3.93 0 .33.1.66.3.92.2.27.47.46.78.55.15.04.29.06.45.07h13.6c.02-.04.06-.13.1-.27.41-1.42-.62-2.85-2.04-2.85ZM3.11 18.54l-.79 1.5c-.08.16-.16.31-.24.47-.06.15-.12.3-.16.46-.08.33-.06.68.07 1 .12.32.33.59.6.76.28.17.6.24.9.2.32-.05.61-.2.84-.45.11-.11.2-.24.28-.38.09-.15.17-.3.25-.46L6 19.46c-.09-.15-.95-1.47-2.89-.92Zm20.59-3a1.47 1.47 0 0 0-.78-.54c-.15-.04-.3-.06-.45-.07h-3.82l-4.39-7.83c-.67.7-.96 1.49-1.08 2.2-.16 1.03.04 2.09.55 3l5.27 9.39c.08.15.17.3.26.44.08.13.17.26.28.37.23.23.53.38.85.42.32.04.64-.02.92-.19.28-.16.5-.42.62-.72.12-.31.14-.65.07-.97-.04-.15-.1-.29-.17-.43l-.24-.46-1.22-2.16h1.6c.16 0 .33 0 .5-.01.15 0 .3-.03.45-.07.31-.09.58-.28.78-.54.2-.27.3-.59.3-.92 0-.34-.1-.66-.3-.92Z" />
    </svg>
  );
}

export function GooglePlayStoreMark() {
  return (
    <svg viewBox="0 0 24 24" role="img" aria-label="Google Play">
      <path d="m22.02 13.3-3.92 2.22-3.52-3.5 3.55-3.52 3.89 2.2a1.49 1.49 0 0 1 0 2.6ZM1.34.92a1.49 1.49 0 0 0-.12.57v21.02c0 .22.05.42.13.6L12.5 12.02 1.34.92Zm12.2 10.07 3.26-3.24L3.45.2a1.47 1.47 0 0 0-.95-.18l11.04 10.97Zm0 2.07-11 10.93c.3.04.61-.01.91-.18l13.32-7.54-3.23-3.21Z" />
    </svg>
  );
}

export function StoreDownloadButtons({ showQr = false }: { showQr?: boolean }) {
  return (
    <div className="app-store-links">
      <div className="app-store-link-group">
        <a className="app-store-button" href={appLaunchCampaign.appStoreUrl} target="_blank" rel="noreferrer" aria-label="Download Masjid Bilal on the Apple App Store">
          <AppleStoreMark />
          <span><small>Download on the</small><strong>App Store</strong></span>
        </a>
        {showQr ? <Image className="app-store-qr" src="/app/app-store-qr.png" alt="QR code for the Masjid Bilal Apple App Store listing" width={720} height={720} /> : null}
      </div>
      <div className="app-store-link-group">
        <a className="app-store-button" href={appLaunchCampaign.googlePlayUrl} target="_blank" rel="noreferrer" aria-label="Get Masjid Bilal on Google Play">
          <GooglePlayStoreMark />
          <span><small>Get it on</small><strong>Google Play</strong></span>
        </a>
        {showQr ? <Image className="app-store-qr" src="/app/google-play-qr.png" alt="QR code for the Masjid Bilal Google Play listing" width={720} height={720} /> : null}
      </div>
    </div>
  );
}
