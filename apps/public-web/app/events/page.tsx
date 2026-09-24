import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";
import { getPublicEvents, getPublicVolunteerOpportunities } from "@hbic/shared";

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
      <section className="section">
        <h2>Events</h2>
        <p>Current HBIC programs, halaqah series, youth activities, and community volunteer opportunities.</p>
        <div className="grid">
          {events.map((event) => (
            <article className="card image-card" key={event.id}>
              {event.image ? <img src={eventImagePath(event.image)} alt={`${event.title} flyer`} /> : null}
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
