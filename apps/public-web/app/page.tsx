import { getPublishedContent } from "../lib/contentStore";
import { PrayerTable } from "../components/PrayerTable";
import { SiteChrome } from "../components/SiteChrome";

export const revalidate = 300;

export default async function HomePage() {
  const { content } = await getPublishedContent();
  const { announcements, donationCategories, events, iqamahTime, jumuahSchedule, prayerTime, settings } = content;
  const summerCamp = events.find((event) => event.id === "event-summer-camp-2026") ?? events[0];
  const announcement = announcements[0];

  return (
    <SiteChrome settings={settings}>
      <section className="hero">
        <div className="hero-panel">
          <img className="hero-photo" src="/photos/masjid-exterior.png" alt="Hazrat Bilal Islamic Centre exterior" />
          <div className="hero-content">
            <img className="hero-logo" src="/brand/hbic-logo.png" alt="HBIC logo" />
            <span className="eyebrow">HBIC Calgary</span>
            <h1>Hazrat Bilal Islamic Centre</h1>
            <p className="lead">Prayer times, iqamah updates, Jumu&apos;ah, youth programs, announcements, donations, and community services for Calgary.</p>
            <div className="actions">
              <a className="button primary" href="/prayer-times">View prayer times</a>
              <a className="button secondary" href={settings.donationUrl} target="_blank" rel="noreferrer">Donate</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Today at HBIC</h2>
        <p>Prayer times, Jumu&apos;ah reminders, announcements, and current programs for the HBIC Calgary community.</p>
        <div className="grid">
          <PrayerTable prayerTime={prayerTime} iqamahTime={iqamahTime} />
          <div className="card dark">
            <span className="kicker">Jumu&apos;ah</span>
            <h3>Two khutbahs</h3>
            <p className="muted">First khutbah {jumuahSchedule.firstKhutbahTime}. Second khutbah {jumuahSchedule.secondKhutbahTime}. Please arrive early.</p>
          </div>
          {announcement ? (
            <div className="card gold">
              <span className="kicker">Announcement</span>
              <h3>{announcement.title}</h3>
              <p className="muted">{announcement.body}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="section">
        <div className="promo-card">
          <img src="/photos/summer-camp-2026.jpeg" alt="HBIC Summer Camp 2026 flyer" />
          <div>
            <span className="kicker">Summer Camp 2026</span>
            <h2>Register your child for a summer of faith, friendship, and fun.</h2>
            <p>
              Boys and girls ages 7-12 can enjoy Islamic lessons, stories of the Prophets, creative projects, sports, leadership activities, competitions, and a positive environment with caring instructors.
            </p>
            <div className="actions">
              <a className="button primary" href={summerCamp.registrationLink}>Contact us to register</a>
              <a className="button light" href="/events">View camp details</a>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Programs and giving</h2>
        <div className="grid">
          {events.slice(0, 3).map((event) => (
            <div className="card" key={event.id}>
              <span className="kicker">{event.category}</span>
              <h3>{event.title}</h3>
              <p className="muted">{event.date} · {event.startTime} · {event.description}</p>
            </div>
          ))}
          <div className="card dark">
            <span className="kicker">Donate</span>
            <h3>{donationCategories[0]?.title ?? "General Donation"}</h3>
            <p className="muted">Support daily prayer services, classes, youth programs, and community work.</p>
            <div className="actions"><a className="button secondary" href="/donate">Donation options</a></div>
          </div>
        </div>
      </section>

      <section className="section compact-section">
        <h2>Community Media</h2>
        <div className="grid">
          <div className="card wide media-preview">
            <img src="/media/videos/taraweeh-2025-recitation-poster.jpg" alt="Taraweeh 2025 recitation poster" />
            <div>
              <span className="kicker">Featured clip</span>
              <h3>Taraweeh 2025 Recitation</h3>
              <p className="muted">Watch a beautiful Ramadan recitation moment from HBIC.</p>
              <div className="actions"><a className="button primary" href="/media">Watch on Media Page</a></div>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
