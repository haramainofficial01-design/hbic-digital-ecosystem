import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedPageContent as getPublishedContent } from "../../lib/contentStore";
import { isVisibleItem, type ServiceItem } from "@hbic/shared";
import Image from "next/image";
import type { CSSProperties } from "react";

const programs = [
  {
    id: "quran-classes",
    title: "Qur'an Classes",
    description: "Qur'an learning opportunities for children and adults, with placement details available through the HBIC office.",
    image: "/media/images/quran-reflections.jpeg",
    href: "/contact"
  },
  {
    id: "youth",
    title: "Youth Programs",
    description: "Safe, beneficial programs where youth can learn, connect, volunteer, and grow around the masjid.",
    image: "/media/images/youth-program.jpeg",
    href: "/youth"
  },
  {
    id: "sisters",
    title: "Sisters' Programs",
    description: "Programs and gatherings for sisters, with community learning and support in a respectful setting.",
    image: "",
    href: "/contact"
  },
  {
    id: "volunteer",
    title: "Volunteer Opportunities",
    description: "Help with Jumu'ah, events, youth programming, Ramadan support when seasonal, and general community service.",
    image: "/media/images/community-jumuah.jpg",
    href: "mailto:info@hbic.ca?subject=Volunteer%20Inquiry%20-%20HBIC"
  },
  {
    id: "community",
    title: "Community Support",
    description: "A first point of contact for community needs, referrals, and support pathways through the masjid.",
    image: "/photos/masjid-exterior.png",
    href: "/contact"
  }
];

export const revalidate = 300;

function programImagePath(program: ServiceItem) {
  if (!program.image) return "";
  return program.image === "quran-academy.jpeg" || program.image === "HBIC_Quran_Academy_2026-27_Poster.jpeg" || program.image === "masjid-exterior.png" ? `/photos/${program.image}` : `/media/images/${program.image}`;
}

export default async function ProgramsPage() {
  const { content } = await getPublishedContent();
  const academyEnabled = process.env.ACADEMY_PREVIEW_ENABLED === "true";
  const programsById = new Map(content.programs.map((program) => [program.id, program]));
  const publishedPrograms = content.programs.filter(isVisibleItem).length
    ? content.programs.filter(isVisibleItem).map((program) => ({
        ...program,
        href: program.href || (program.contactMethod === "form" ? `mailto:${content.settings.email}?subject=${encodeURIComponent(program.title)}` : "/contact"),
        image: programImagePath(program)
      }))
    : programs.map((program) => {
        const published = programsById.get(program.id);
        return published ? { ...program, title: published.title, description: published.description } : program;
      });
  const visiblePrograms = academyEnabled ? [
    { id: "quran-academy", title: "HBIC Qur’an Academy — Children's Classes", description: "Mondays & Thursdays, 5:30–7:00 PM. $50 CAD per child/month. Card online or cash at HBIC. Register online for the 2026–2027 term; final class February 1, followed by the Ramadan/Eid break.",
      image: "/photos/HBIC_Quran_Academy_2026-27_Poster.jpeg", href: "/quran-academy" },
    ...publishedPrograms.filter((program) => program.id !== "quran-classes" && program.id !== "quran-academy")
  ] : publishedPrograms;

  return (
    <SiteChrome settings={content.settings} contentVersion={content.version}>
      <section className="section interior-page-section">
        <div className="page-hero" style={{ "--hero-image": "url('/photos/prayer-hall.png')" } as CSSProperties}>
          <span className="eyebrow">GROW TOGETHER</span>
          <h2>Programs &amp; Services</h2>
          <p>Explore learning, youth, sisters&apos; gatherings, volunteering, and community support at Masjid Bilal.</p>
        </div>
        <div className="interior-section-intro"><span className="eyebrow">THERE IS ROOM FOR YOU HERE</span><h3>Choose your place to begin.</h3><p>Every program connects back to our community and its everyday needs.</p></div>
        <div className="grid">
          {visiblePrograms.map((program) => (
            <a className={`card ${program.image ? "image-card" : "dark"}`} href={program.href} key={program.title}>
              {program.image ? <Image src={program.image} alt={`${program.title} at HBIC`} width={1024} height={1280} style={{ height: "auto", objectFit: "contain" }} /> : null}
              <span className="kicker">Program</span>
              <h3>{program.title}</h3>
              <p className="muted">{program.description}</p>
            </a>
          ))}
        </div>
      </section>
    </SiteChrome>
  );
}
