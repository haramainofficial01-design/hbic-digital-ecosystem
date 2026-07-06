import { CopyButton } from "../../components/CopyButton";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";

const etransferEmail = "bilalislamiccentrecalgary@gmail.com";

export const revalidate = 300;

export default async function DonatePage() {
  const { content } = await getPublishedContent();
  const { donationCategories, settings } = content;

  return (
    <SiteChrome settings={settings}>
      <section className="section">
        <h2>Support Hazrat Bilal Islamic Centre</h2>
        <p>Your donation helps support daily masjid operations, prayer services, Islamic education, youth programs, sisters&apos; programs, Ramadan activities, community support, and facility upkeep.</p>
        <div className="grid">
          <div className="card dark wide">
            <span className="kicker">PayPal / Credit Card</span>
            <h3>Donate securely online</h3>
            <p className="muted">Use the HBIC donation link for PayPal or credit card contributions.</p>
            <div className="actions">
              <a className="button primary" href={settings.donationUrl} target="_blank" rel="noreferrer">Donate by PayPal / Credit Card</a>
            </div>
          </div>
          <div className="card gold wide">
            <span className="kicker">E-transfer</span>
            <h3>{etransferEmail}</h3>
            <p className="muted">Send e-transfers directly to the HBIC donation email.</p>
            <div className="actions">
              <CopyButton text={etransferEmail} label="Copy E-transfer Email" />
              <a className="button light" href={`mailto:${etransferEmail}?subject=HBIC%20Donation`}>Open Email App</a>
            </div>
          </div>
          <div className="card full donation-goal">
            <span className="kicker">Donation Goal</span>
            <h3>$200,000 by Dec. 2026</h3>
            <p className="muted">The current raised amount can be published from admin settings when HBIC is ready to show live progress.</p>
          </div>
          {donationCategories.map((category) => (
            <div className="card" key={category.id}>
              <span className="kicker">Donation</span>
              <h3>{category.title}</h3>
              <p className="muted">{category.description}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteChrome>
  );
}
