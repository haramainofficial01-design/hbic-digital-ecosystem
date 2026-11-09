import Image from "next/image";
import { isVisibleItem, type Announcement } from "@hbic/shared";

export function JumuahTimingNotice({ announcements }: { announcements: Announcement[] }) {
  const notice = announcements.find(item => item.id === "jumuah-november-2026" && isVisibleItem(item) && (!item.expiresAt || Date.parse(item.expiresAt) > Date.now()));
  if (!notice?.image) return null;
  return <section className="section" aria-labelledby="jumuah-timing-notice">
    <div className="card">
      <h2 id="jumuah-timing-notice">{notice.title}</h2>
      <p>{notice.body}</p>
      <a href={notice.image} aria-label="Open the new Jumu’ah timings poster at full size">
        <Image src={notice.image} alt="New Jumu’ah timings effective Friday November 13, 2026. First khutbah 1:30 PM; second khutbah 2:15 PM. First-service doors close at 1:45 PM. Please arrive early. Times shown are khutbah start times." width={1320} height={931} sizes="(max-width: 800px) 100vw, 1000px" unoptimized style={{ display: "block", width: "100%", maxWidth: 1000, height: "auto", margin: "24px auto 0" }} />
      </a>
    </div>
  </section>;
}
