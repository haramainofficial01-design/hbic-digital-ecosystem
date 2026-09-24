import { existsSync } from "fs";
import { join } from "path";
import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";

const youthHighlights = [
  {
    title: "Heart Antidotes",
    image: "/media/images/heart-antidotes.jpeg",
    text: "Short reflections to uplift the heart and strengthen faith."
  },
  {
    title: "Qur'an Reflections",
    image: "/media/images/quran-reflections.jpeg",
    text: "Lessons and guidance from the Qur'an shared with the community."
  },
  {
    title: "Youth Program Moments",
    image: "/media/images/youth-program.jpeg",
    text: "Program highlights from youth gatherings and beneficial activities."
  }
];

const communityMoments = [
  {
    title: "Community Gatherings",
    image: "/media/images/community-jumuah.jpg",
    text: "Moments from HBIC prayer, reminders, and community gatherings."
  },
  {
    title: "Youth Iftar & Programs",
    image: "/media/images/youth-iftar.jpeg",
    text: "A look at youth program connection, food, and brotherhood."
  }
];

export const revalidate = 300;

export default async function MediaPage() {
  const { content } = await getPublishedContent();
  const { mediaItems, settings } = content;
  const featured = mediaItems.find((item) => item.featured && item.visible) ?? mediaItems[0];
  const featuredVideoPublicPath = featured?.videoUrl.startsWith("/") ? featured.videoUrl.slice(1) : featured?.videoUrl;
  const hasFeaturedVideo = featuredVideoPublicPath ? existsSync(join(process.cwd(), "public", featuredVideoPublicPath)) : false;
  const socialLinks = [
    { label: "Instagram", href: settings.social.instagram, note: "Reminders, clips, and youth updates" },
    { label: "YouTube", href: settings.social.youtube, note: "Recitations, reminders, and program media" },
    { label: "TikTok", href: settings.social.tiktok, note: "Short reminders and HBIC Youth clips" }
  ];

  return (
    <SiteChrome settings={settings} contentVersion={content.version}>
      <section className="section media-hero">
        <span className="eyebrow dark-text">HBIC Media</span>
        <h2>Taraweeh 2025 Recitation</h2>
        <p>A glimpse of the beautiful Qur&apos;an recitation and Ramadan moments shared with the HBIC community.</p>
      </section>

      <section className="section">
        <div className="media-layout">
          <div className="video-card">
            <div className="video-meta">
              <span className="kicker">Featured Recitation</span>
              <h3>{featured?.title ?? "Taraweeh 2025 Recitation"}</h3>
              <p>{featured?.description ?? "A glimpse of the beautiful Qur'an recitation and Ramadan moments shared with the HBIC community."}</p>
              <div className="meta-row">
                <span>{featured?.type ?? "Ramadan / Qur'an Recitation"}</span>
                <span>{featured?.year ?? 2025}</span>
                {hasFeaturedVideo && featured ? <a href={featured.videoUrl}>Watch Clip</a> : null}
              </div>
            </div>
            {hasFeaturedVideo && featured ? (
              <video
                className="media-video"
                controls
                preload="metadata"
                poster={featured.posterUrl}
              >
                <source src={featured.videoUrl} type="video/mp4" />
                Your browser does not support this video player.
              </video>
            ) : featured?.posterUrl ? (
              <img className="media-video" src={featured.posterUrl} alt={`${featured.title} poster`} />
            ) : null}
            <div className="follow-panel">
              <strong>Follow HBIC Youth for more reminders, clips, and program updates.</strong>
              <div className="social-row">
                {socialLinks.map((link) => (
                  <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <aside className="card dark media-side">
            <span className="kicker">Respectful Media</span>
            <h3>Beneficial content to revisit and share</h3>
            <p className="muted">
              HBIC shares beneficial reminders, Qur&apos;an recitations, program highlights, and community moments across our online platforms. This Taraweeh 2025 clip is an example of the kind of content our community can revisit and share.
            </p>
          </aside>
        </div>
      </section>

      <section className="section">
        <h2>HBIC Social Media</h2>
        <p>Follow HBIC Youth for reminders, clips, and program updates.</p>
        <div className="grid">
          {socialLinks.map((link) => (
            <a className="card social-card" key={link.href} href={link.href} target="_blank" rel="noreferrer">
              <span className="kicker">{link.label}</span>
              <h3>{link.label === "YouTube" ? "Watch HBIC Youth" : `Follow on ${link.label}`}</h3>
              <p className="muted">{link.note}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Youth & Program Highlights</h2>
        <div className="grid">
          {youthHighlights.map((item) => (
            <article className="card image-card" key={item.title}>
              <img src={item.image} alt={`${item.title} HBIC program highlight`} />
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section">
        <h2>Community Moments</h2>
        <div className="grid">
          {communityMoments.map((item) => (
            <article className="card wide image-card" key={item.title}>
              <img src={item.image} alt={`${item.title} at HBIC`} />
              <h3>{item.title}</h3>
              <p className="muted">{item.text}</p>
            </article>
          ))}
        </div>
      </section>
    </SiteChrome>
  );
}
