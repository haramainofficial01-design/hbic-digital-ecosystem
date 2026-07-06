import { SiteChrome } from "../../components/SiteChrome";
import { getPublishedContent } from "../../lib/contentStore";

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

export default async function ProgramsPage() {
  const { content } = await getPublishedContent();
  const programsById = new Map(content.programs.map((program) => [program.id, program]));
  const publishedPrograms = programs.map((program) => {
    const published = programsById.get(program.id);
    return published ? { ...program, title: published.title, description: published.description } : program;
  });

  return (
    <SiteChrome settings={content.settings}>
      <section className="section">
        <h2>Programs & Services</h2>
        <p>Core HBIC programs and services for learning, youth, sisters, volunteers, and community support.</p>
        <div className="grid">
          {publishedPrograms.map((program) => (
            <a className={`card ${program.image ? "image-card" : "dark"}`} href={program.href} key={program.title}>
              {program.image ? <img src={program.image} alt={`${program.title} at HBIC`} /> : null}
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
