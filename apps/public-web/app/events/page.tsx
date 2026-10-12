import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedPageContent as getPublishedContent } from "../../lib/contentStore";
import { getPastEvents, getPublicEvents, getPublicVolunteerOpportunities, publicEventImagePath } from "@hbic/shared";
import Image from "next/image";
import type { CSSProperties } from "react";

export const revalidate = 300;

export default async function EventsPage() {
  const { content } = await getPublishedContent();
  const { settings } = content;
  const events = getPublicEvents(content);
  const pastEvents = getPastEvents(content);
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
              {event.image ? <a href={publicEventImagePath(event.image)} aria-label={`Open full-size ${event.title} poster`}><Image src={publicEventImagePath(event.image)} alt={`${event.title} flyer`} width={1024} height={1280} style={{ width: "100%", height: "auto", objectFit: "contain" }} /></a> : null}
              <span className="kicker">{event.category}</span>
              <h3>{event.title}</h3>
              <p className="muted">{event.date} · {event.startTime}{event.endTime ? ` · ${event.endTime}` : ""} · {event.location}</p>
              <p className="muted">{event.summary ?? event.description}</p>
              {event.summary ? <details><summary>Class details</summary><p className="muted">{event.description}</p></details> : null}
              {event.registrationLink ? (
                <div className="actions"><a className="button primary" href={event.registrationLink}>{event.id === "event-quran-academy" ? "Register Now" : "Learn More"}</a></div>
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
        {!events.length ? <p>No current events are scheduled. New gatherings will appear here when published.</p> : null}
      </section>
      <section className="section" id="past-events">
        <span className="eyebrow">COMMUNITY MEMORIES</span><h2>Past Events &amp; Highlights</h2>
        <div className="grid">{pastEvents.map(event => <article className="card image-card" key={event.id}>
          {event.image ? <Image src={publicEventImagePath(event.image)} alt={`${event.title} original poster`} width={1024} height={1280} style={{ width: "100%", height: "auto", objectFit: "contain" }} /> : null}
          <span className="kicker">Completed · {event.date}</span><h3>{event.title}</h3><p className="muted">{event.description}</p>
          {event.highlightUrl ? <a className="button primary" href={event.highlightUrl} target="_blank" rel="noreferrer">Watch Summer Camp 2026 Highlights</a> : null}
        </article>)}</div>
        {!pastEvents.length ? <p>Past event highlights will appear here when published.</p> : null}
      </section>
    </SiteChrome>
  );
}
