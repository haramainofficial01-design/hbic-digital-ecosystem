import type { CSSProperties } from "react";
import { getPublicEvents } from "@hbic/shared";
import Image from "next/image";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";

export const revalidate = 300;

export default async function YouthPage() {
  const { content } = await getPublishedContent();
  const { settings } = content;
  const events = getPublicEvents(content);
  const youthEvents = events.filter((event) => event.category === "Youth");
  const summerCamp = events.find((event) => event.id === "event-summer-camp-2026");
  const socialCards = [
    { label: "Instagram", href: settings.social.instagram, text: "Program updates, reminders, and community moments." },
    { label: "YouTube", href: settings.social.youtube, text: "Recitations, beneficial reminders, and youth media." },
    { label: "TikTok", href: settings.social.tiktok, text: "Short reminders and HBIC Youth clips." }
  ];

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section">
        <div className="page-hero" style={{ "--hero-image": "url('/media/images/youth-program.jpeg')" } as CSSProperties}>
          <Image src="/brand/hbic-youth-logo.png" alt="HBIC Youth logo" width={98} height={98} style={{ width: 98, height: 98, borderRadius: 22, background: "white" }} />
          <h2>HBIC Youth</h2>
          <p>A safe, beneficial space for youth to learn, connect, and grow through reminders, activities, service, and community.</p>
          <div className="actions">
            <a className="button primary" href={settings.social.youtube} target="_blank" rel="noreferrer">Watch on YouTube</a>
            <a className="button secondary" href="mailto:info@hbic.ca?subject=HBIC%20Youth%20Volunteer">Volunteer with Youth</a>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Youth Channels</h2>
        <div className="grid">
          {socialCards.map((card) => (
            <a className="card social-card" key={card.href} href={card.href} target="_blank" rel="noreferrer">
              <span className="kicker">{card.label}</span>
              <h3>{card.label}</h3>
              <p className="muted">{card.text}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Featured Youth Programs</h2>
        <div className="grid">
          {youthEvents.map((event) => (
            <article className="card image-card wide" key={event.id}>
              <Image src="/photos/summer-camp-2026.jpeg" alt={`${event.title} flyer`} width={1200} height={800} />
              <span className="kicker">Youth Program</span>
              <h3>{event.title}</h3>
              <p className="muted">{event.description}</p>
              {summerCamp?.registrationLink ? (
                <div className="actions"><a className="button primary" href={summerCamp.registrationLink}>Contact us</a></div>
              ) : null}
            </article>
          ))}
          <article className="card image-card wide">
            <Image src="/media/images/youth-iftar.jpeg" alt="HBIC youth gathering" width={1200} height={800} />
            <span className="kicker">Youth Gallery</span>
            <h3>Program Moments</h3>
            <p className="muted">Wide community photos are used tastefully to show connection, learning, and service.</p>
            <div className="actions"><a className="button secondary" href="/media">View Media</a></div>
          </article>
        </div>
      </section>
    </SiteChrome>
  );
}
