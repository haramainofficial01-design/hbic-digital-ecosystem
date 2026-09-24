import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";
import { getPublicEvents, getPublicVolunteerOpportunities } from "@hbic/shared";
import Image from "next/image";
import type { CSSProperties } from "react";

function eventImagePath(image: string) {
  return image === "summer-camp-2026.jpeg" || image === "quran-academy.jpeg" ? `/photos/${image}` : `/media/images/${image}`;
}

export const revalidate = 300;

export default async function EventsPage() {
  const { content } = await getPublishedContent();
  const { settings } = content;
  const events = getPublicEvents(content);
  const volunteerOpportunities = getPublicVolunteerOpportunities(content.volunteerOpportunities);

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section interior-page-section">
        <div className="page-hero" style={{ "--hero-image": "url('/media/images/community-jumuah.jpg')" } as CSSProperties}>
          <span className="eyebrow">GATHER AT MASJID BILAL</span>
          <h2>Events</h2>
          <p>Learning, friendship, and service make the masjid more than a place to pray. Find what&apos;s happening next.</p>
        </div>
        <div className="interior-section-intro"><span className="eyebrow">COME AS YOU ARE</span><h3>Find your next gathering.</h3><p>Current programs, halaqah series, youth activities, and ways to volunteer.</p></div>
        <div className="grid">
          {events.map((event) => (
            <article className="card image-card" key={event.id}>
              {event.image ? <Image src={eventImagePath(event.image)} alt={`${event.title} flyer`} width={1200} height={800} /> : null}
              <span className="kicker">{event.category}</span>
              <h3>{event.title}</h3>
              <p className="muted">{event.date} · {event.startTime}{event.endTime ? ` · ${event.endTime}` : ""} · {event.location}</p>
              <p className="muted">{event.description}</p>
              {event.registrationLink ? (
                <div className="actions"><a className="button primary" href={event.registrationLink}>Contact us</a></div>
              ) : null}
            </article>
          ))}
          {volunteerOpportunities.map((item) => (
            <div className="card gold" key={item.id}>
              <span className="kicker">Volunteer</span>
              <h3>{item.title}</h3>
              <p className="muted">{item.description}</p>
              <div className="actions">
                <a className="button primary" href={`mailto:${item.contactEmail || settings.email}?subject=Volunteer%20Inquiry%20-%20HBIC`}>Email to Help</a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </SiteChrome>
  );
}
