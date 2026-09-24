import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";

export const revalidate = 300;

export default async function ContactPage() {
  const { content } = await getPublishedContent();
  const { settings } = content;
  const addressQuery = encodeURIComponent(settings.address);
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;
  const appleMapsUrl = `https://maps.apple.com/?q=${addressQuery}`;

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section">
        <h2>Contact</h2>
        <p>Reach the centre office, find directions, and follow community updates.</p>
        <div className="grid">
          <div className="card">
            <span className="kicker">Phone</span>
            <h3>{settings.phone}</h3>
            <div className="actions"><a className="button primary" href={`tel:${settings.phone}`}>Call the Office</a></div>
          </div>
          <div className="card">
            <span className="kicker">Email</span>
            <h3>{settings.email}</h3>
            <div className="actions"><a className="button primary" href={`mailto:${settings.email}`}>Email the Office</a></div>
          </div>
          <div className="card dark">
            <span className="kicker">Directions</span>
            <h3>Visit Masjid Bilal</h3>
            <p className="muted">{settings.address}</p>
            <div className="actions">
              <a className="button primary" href={googleMapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a>
              <a className="button secondary" href={appleMapsUrl} target="_blank" rel="noreferrer">Open in Apple Maps</a>
            </div>
          </div>
          <div className="card gold">
            <span className="kicker">Website</span>
            <h3>hbic.ca</h3>
            <div className="actions"><a className="button light" href={settings.website} target="_blank" rel="noreferrer">Open website</a></div>
          </div>
          <div className="card">
            <span className="kicker">Social</span>
            <h3>HBIC Youth</h3>
            <p className="muted">Follow reminders, clips, and youth program updates.</p>
            <div className="social-row">
              <a href={settings.social.instagram} target="_blank" rel="noreferrer">Instagram</a>
              <a href={settings.social.youtube} target="_blank" rel="noreferrer">YouTube</a>
              <a href={settings.social.tiktok} target="_blank" rel="noreferrer">TikTok</a>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
