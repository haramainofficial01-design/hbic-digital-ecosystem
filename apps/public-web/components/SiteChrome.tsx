import { defaultContent, type MasjidSettings } from "@hbic/shared";
import Link from "next/link";

const links = [
  ["Prayer Times", "/prayer-times"],
  ["Events", "/events"],
  ["Media", "/media"],
  ["Donate", "/donate"],
  ["Programs", "/programs"],
  ["Youth", "/youth"],
  ["Contact", "/contact"],
  ["About", "/about"]
] as const;

export function SiteChrome({ children, settings = defaultContent.settings }: { children: React.ReactNode; settings?: MasjidSettings }) {
  return (
    <div className="site">
      <nav className="nav">
        <Link className="brand" href="/">
          <img src="/brand/hbic-logo.png" alt="HBIC logo" />
          <span>{settings.shortName}</span>
        </Link>
        <div className="links">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>{label}</Link>
          ))}
        </div>
      </nav>
      {children}
      <footer className="footer">
        <div className="footer-inner">
          <strong>{settings.masjidName}</strong>
          <span>{settings.address}</span>
          <span>{settings.phone} · {settings.email}</span>
          <span>Prayer, programs, youth updates, donations, media, and community services for HBIC Calgary.</span>
        </div>
      </footer>
    </div>
  );
}
