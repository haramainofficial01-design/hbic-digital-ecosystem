import Link from "next/link";
import { SiteChrome } from "./SiteChrome";

export function NotFoundContent() {
  return (
    <SiteChrome>
      <section className="section">
        <div className="card full dark">
          <span className="kicker">Page Not Found</span>
          <h2>We could not find that page.</h2>
          <p className="muted">
            The page may have moved, or the link may be incomplete. You can return home or visit the media page for the Taraweeh 2025 recitation and community updates.
          </p>
          <div className="actions">
            <Link className="button primary" href="/">Go Home</Link>
            <Link className="button secondary" href="/media">Visit Media</Link>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
