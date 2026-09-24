import { getPublishedContent } from "../lib/contentStore";
import { PrayerTable } from "../components/PrayerTable";
import { SiteChrome } from "../components/SiteChrome";
import { WelcomeFilm } from "../components/WelcomeFilm";
import { AppLaunchPromotion } from "../components/AppLaunchPromotion";
import { getEffectiveJumuahDoorNotice, getPublicEvents, isVisibleItem } from "@hbic/shared";

export const revalidate = 300;

function eventImagePath(image: string) {
  return image === "summer-camp-2026.jpeg" || image === "quran-academy.jpeg" ? `/photos/${image}` : `/media/images/${image}`;
}

export default async function HomePage() {
  const { content } = await getPublishedContent();
  const renderedAt = new Date().toISOString();
  const { donationCategories, iqamahTime, jumuahSchedule, prayerTime, settings } = content;
  const announcements = content.announcements.filter(isVisibleItem);
  const events = getPublicEvents(content);
  const summerCamp = events.find((event) => event.id === "event-summer-camp-2026") ?? events.find((event) => event.featured) ?? events[0];
  const announcement = announcements.find((item) => item.pinned) ?? announcements[0];
  const featuredMedia = content.mediaItems.find((item) => item.visible && item.featured) ?? content.mediaItems.find((item) => item.visible);
  const jumuahDoorNotice = getEffectiveJumuahDoorNotice(
    jumuahSchedule,
    new Date(),
    content.featureFlags.jumuahDoorNoticeEnabled
  );

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section home-prayer-first" aria-label="Today’s prayer times at Masjid Bilal">
        <PrayerTable
          prayerTime={prayerTime}
          iqamahTime={iqamahTime}
          hijriSettings={content.hijriSettings}
          showWhiteDays={content.featureFlags.whiteDaysEnabled}
          initialNow={renderedAt}
        />
      </section>

      <section className="hero">
        <div className="hero-panel">
          <img className="hero-photo" src="/photos/masjid-exterior.png" alt="Hazrat Bilal Islamic Centre exterior" />
          <div className="hero-content">
            <img className="hero-logo" src="/brand/hbic-logo.png" alt="HBIC logo" />
            <span className="eyebrow">Masjid Bilal</span>
            <h1>Hazrat Bilal Islamic Centre</h1>
            <p className="lead">Prayer times, iqamah updates, Jumu&apos;ah, youth programs, announcements, donations, and community services for Calgary.</p>
            <div className="actions">
              <a className="button primary" href="/prayer-times">View prayer times</a>
              <a className="button secondary" href={settings.donationUrl} target="_blank" rel="noreferrer">Donate</a>
            </div>
          </div>
        </div>
      </section>

      <WelcomeFilm />

      <AppLaunchPromotion />

      <section className="section">
        <h2>Today at Masjid Bilal</h2>
        <p>Prayer times, Jumu&apos;ah reminders, announcements, and current programs for the Hazrat Bilal Islamic Centre community.</p>
        <div className="grid">
          <div className="card dark wide">
            <span className="kicker">Jumu&apos;ah</span>
            <h3>Two khutbahs</h3>
            <p className="muted">
              First khutbah {jumuahSchedule.firstKhutbahTime}. Second khutbah {jumuahSchedule.secondKhutbahTime}.
              {jumuahDoorNotice ? ` ${jumuahDoorNotice.body}` : ""}
            </p>
          </div>
          {announcement ? (
            <div className="card gold wide">
              <span className="kicker">Announcement</span>
              <h3>{announcement.title}</h3>
              <p className="muted">{announcement.body}</p>
            </div>
          ) : null}
        </div>
      </section>

      {content.featureFlags.communityHubEnabled ? <section className="section compact-section">
        <h2>Community</h2>
        <p>One timely starting point for learning, events, volunteering, and community information.</p>
        <div className="grid">
          <div className="card wide gold">
            <span className="kicker">Community spotlight</span>
            <h3>{summerCamp?.title ?? "What’s happening at Masjid Bilal"}</h3>
            <p className="muted">{summerCamp?.summary ?? "See current events, Jumu'ah information, volunteer opportunities, and new community services."}</p>
            <div className="actions">
              <a className="button primary" href="/community">Open Community</a>
              <a className="button secondary" href="/events">View events</a>
            </div>
          </div>
        </div>
      </section> : null}

      {summerCamp ? <section className="section">
        <div className="promo-card">
          {summerCamp.image ? <img src={eventImagePath(summerCamp.image)} alt={`${summerCamp.title} flyer`} /> : null}
          <div>
            <span className="kicker">{summerCamp.category}</span>
            <h2>{summerCamp.title}</h2>
            <p>{summerCamp.summary ?? summerCamp.description}</p>
            <div className="actions">
              <a className="button primary" href={summerCamp.registrationLink || "/contact"}>Contact us</a>
              <a className="button light" href="/events">View camp details</a>
            </div>
          </div>
        </div>
      </section> : null}

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
            <img src={featuredMedia?.posterUrl ?? "/media/videos/taraweeh-2025-recitation-poster.jpg"} alt={`${featuredMedia?.title ?? "Taraweeh 2025 Recitation"} poster`} />
            <div>
              <span className="kicker">Featured clip</span>
              <h3>{featuredMedia?.title ?? "Taraweeh 2025 Recitation"}</h3>
              <p className="muted">{featuredMedia?.description ?? "Watch a beautiful Ramadan recitation moment from Masjid Bilal."}</p>
              <div className="actions"><a className="button primary" href="/media">Watch on Media Page</a></div>
            </div>
          </div>
        </div>
      </section>
    </SiteChrome>
  );
}
