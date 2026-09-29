import { getPublishedContent } from "../lib/contentStore";
import { PrayerTable } from "../components/PrayerTable";
import { SiteChrome } from "../components/SiteChrome";
import { WelcomeFilm } from "../components/WelcomeFilm";
import { AppLaunchPromotion } from "../components/AppLaunchPromotion";
import { getEffectiveJumuahDoorNotice, getPublicEvents, isVisibleItem } from "@hbic/shared";
import Image from "next/image";
import Link from "next/link";

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
  const academyEnabled = process.env.ACADEMY_PREVIEW_ENABLED === "true";

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

      {academyEnabled ? (
        <section className="section home-academy-intro" aria-labelledby="home-academy-heading">
          <div className="home-academy-card">
            <div className="home-academy-copy">
              <span className="eyebrow">FOR OUR YOUNG LEARNERS</span>
              <h2 id="home-academy-heading">HBIC Qur’an Academy</h2>
              <p>Registration is open for October. Classes begin Monday, October 5, then meet Mondays and Thursdays, 5:30–7:00 p.m. There is no class October 1. One Thursday each month is a special activity. The term ends February 1, followed by a Ramadan and Eid break.</p>
              <Link className="button primary" href="/quran-academy">Explore the Academy <span aria-hidden="true">↗</span></Link>
            </div>
            <Image src="/photos/prayer-hall.png" alt="Prayer hall at Masjid Bilal" width={720} height={480} sizes="(max-width: 700px) 100vw, 35vw" />
          </div>
        </section>
      ) : null}

      <section className="hero home-story-hero" aria-labelledby="home-story-heading">
        <div className="hero-panel">
          <Image className="hero-photo" src="/photos/masjid-exterior.png" alt="Hazrat Bilal Islamic Centre exterior in Calgary at sunset" fill sizes="(max-width: 800px) 100vw, 1440px" priority />
          <div className="hero-content">
            <span className="eyebrow">HAZRAT BILAL ISLAMIC CENTRE · CALGARY</span>
            <h1 id="home-story-heading">A place<br />to belong.</h1>
            <p className="lead">Come for prayer. Stay for learning, friendship, and the life of a community built around the masjid.</p>
            <div className="actions">
              <a className="button primary" href="/about">Discover Masjid Bilal</a>
              <a className="button secondary" href="/events">See what&apos;s happening</a>
            </div>
          </div>
          <span className="home-hero-caption">20 Saddlestone Drive NE · Calgary, Alberta</span>
        </div>
      </section>

      <WelcomeFilm />

      <AppLaunchPromotion />

      <section className="section home-current-section">
        <div className="home-section-intro"><span className="eyebrow">THE RHYTHM OF OUR WEEK</span><h2>Here for every day.</h2><p>Jumu&apos;ah, timely notices, and community life in one clear place.</p></div>
        <div className="grid home-current-grid">
          <div className="card dark wide home-current-jumuah">
            <span className="kicker">Jumu&apos;ah</span>
            <h3>Two khutbahs</h3>
            <p className="muted">
              First khutbah {jumuahSchedule.firstKhutbahTime}. Second khutbah {jumuahSchedule.secondKhutbahTime}.
              {jumuahDoorNotice ? ` ${jumuahDoorNotice.body}` : ""}
            </p>
            <a className="home-text-link" href="/prayer-times">View the full schedule <span aria-hidden="true">↗</span></a>
          </div>
          {announcement ? (
            <div className="card gold wide home-current-announcement">
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

      {summerCamp ? <section className="section home-feature-event">
        <div className="promo-card">
          {summerCamp.image ? <Image src={eventImagePath(summerCamp.image)} alt={`${summerCamp.title} flyer`} width={920} height={680} sizes="(max-width: 800px) 100vw, 50vw" /> : null}
          <div>
            <span className="kicker">FEATURED · {summerCamp.category}</span>
            <h2>{summerCamp.title}</h2>
            <p>{summerCamp.summary ?? summerCamp.description}</p>
            <div className="actions">
              <a className="button primary" href={summerCamp.registrationLink || "/contact"}>Learn more</a>
              <a className="button light" href="/events">All events</a>
            </div>
          </div>
        </div>
      </section> : null}

      <section className="section home-programs-section">
        <div className="home-section-intro"><span className="eyebrow">LEARN · GATHER · SERVE</span><h2>There is room for you here.</h2><p>Explore real programs and gatherings happening through the centre.</p></div>
        <div className="grid home-programs-grid">
          {events.slice(0, 3).map((event) => (
            <div className="card" key={event.id}>
              <span className="kicker">{event.category}</span>
              <h3>{event.title}</h3>
              <p className="muted">{event.date} · {event.startTime} · {event.description}</p>
              <a className="home-text-link" href="/events">Explore events <span aria-hidden="true">↗</span></a>
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

      <section className="section compact-section home-media-section">
        <h2>Community Media</h2>
        <div className="grid">
          <div className="card wide media-preview">
            <Image src={featuredMedia?.posterUrl ?? "/media/videos/taraweeh-2025-recitation-poster.jpg"} alt={`${featuredMedia?.title ?? "Taraweeh 2025 Recitation"} poster`} width={720} height={440} sizes="(max-width: 800px) 100vw, 50vw" />
            <div>
              <span className="kicker">Featured clip</span>
              <h3>{featuredMedia?.title ?? "Taraweeh 2025 Recitation"}</h3>
              <p className="muted">{featuredMedia?.description ?? "Watch a beautiful Ramadan recitation moment from Masjid Bilal."}</p>
              <div className="actions"><a className="button primary" href="/media">Watch on Media Page</a></div>
            </div>
          </div>
        </div>
      </section>

      <section className="section home-final-invitation">
        <div className="home-final-image" role="img" aria-label="Prayer hall at Hazrat Bilal Islamic Centre" />
        <div className="home-final-copy">
          <span className="eyebrow">YOUR MASJID IN CALGARY</span>
          <h2>Come as you are.<br />Be part of what grows here.</h2>
          <p>Visit for prayer, meet your community, and find a place to contribute.</p>
          <div className="actions"><a className="button primary" href="/contact">Plan your visit</a><a className="button secondary" href="/programs">Explore programs</a></div>
        </div>
      </section>
    </SiteChrome>
  );
}
