import { CopyButton } from "../../components/CopyButton";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedPageContent as getPublishedContent } from "../../lib/contentStore";
import { ArrowUpRight, HeartHandshake } from "lucide-react";
import { DonationForm } from "../../components/DonationForm";
import { donationFunds } from "@hbic/shared";

const etransferEmail = "bilalislamiccentrecalgary@gmail.com";

export const revalidate = 300;

export default async function DonatePage() {
  const { content } = await getPublishedContent();
  const { settings } = content;

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section donation-page">
        <div className="donation-invitation">
          <div className="donation-invitation-icon" aria-hidden="true"><HeartHandshake /></div>
          <div className="donation-invitation-copy">
            <span className="kicker">Support Masjid Bilal</span>
            <h2>Make a quiet difference today.</h2>
            <p>Your contribution helps sustain prayer services, Islamic learning, youth programs, community care, and the masjid spaces we share.</p>
          </div>
          <a className="button donation-cta" href="#donation-form">
            Donate securely <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
        <div className="grid">
          <DonationForm />
          <div className="card gold wide">
            <span className="kicker">E-transfer</span>
            <h3>{etransferEmail}</h3>
            <p className="muted">Send e-transfers directly to the Masjid Bilal donation email.</p>
            <div className="actions">
              <CopyButton text={etransferEmail} label="Copy E-transfer Email" />
              <a className="button light" href={`mailto:${etransferEmail}?subject=Masjid%20Bilal%20Donation`}>Open Email App</a>
            </div>
          </div>
          <div className="card full donation-goal">
            <span className="kicker">Donation Goal</span>
            <h3>$200,000 by Dec. 2026</h3>
            <p className="muted">Help strengthen the centre&apos;s facilities, programming, and long-term service to the community.</p>
          </div>
          {donationFunds.map((category) => (
            <div className="card" key={category.id}>
              <span className="kicker">Donation</span>
              <h3>{category.title}</h3>
              <p className="muted">{category.description}</p>
              <a className="button light" href={`/donate?fund=${category.id}#donation-form`}>Give to {category.title}</a>
            </div>
          ))}
        </div>
      </section>
    </SiteChrome>
  );
}
