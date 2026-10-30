"use client";
import { academyStarMonthLabel, getAcademyStarMonths, type AcademyStarMonth } from "@hbic/shared";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./AcademyStars.module.css";

export function AcademyStars({ months }: { months: AcademyStarMonth[] }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const expiry = Math.min(...months.map(row => Date.parse(row.photosUntil || "")).filter(at => at > Date.now()));
    const refresh = () => setNow(new Date());
    const timer = Number.isFinite(expiry) ? setTimeout(refresh, Math.min(2_147_483_647, expiry - Date.now() + 30)) : undefined;
    document.addEventListener("visibilitychange", refresh);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", refresh); };
  }, [months, now]);
  const rows = getAcademyStarMonths(months, now);
  if (!rows.length) return null;
  return <section className={`section ${styles.section}`} aria-labelledby="academy-stars-title">
    <div className={styles.heading}><h2 id="academy-stars-title">Star of the Month</h2><p>HBIC Qur’an Academy</p></div>
    {rows.map(row => <div key={row.month} className={styles.month}>
      <h3>{academyStarMonthLabel(row.month)}</h3>
      <div className={styles.students}>{row.winners.map(winner => <figure key={winner.side} className={winner.side === "sisters" ? styles.sisters : undefined}>
        <figcaption>{winner.name}</figcaption>
        {winner.photoUrl ? <img src={winner.photoUrl} alt={`${winner.name}, HBIC Qur’an Academy Star of the Month`} loading="lazy" decoding="async" width={900} height={1050} /> : null}
      </figure>)}</div>
      {row.highlightUrl ? <a className={styles.reel} href={row.highlightUrl} target="_blank" rel="noopener noreferrer">Watch the class celebration ↗</a> : null}
    </div>)}
    <div className={styles.registration}><div><h3>A place to learn and grow.</h3><p>Qur’an reading, recitation and good character.</p></div><Link className="button primary" href="/quran-academy">Register for HBIC Qur’an Academy <span aria-hidden="true">↗</span></Link></div>
  </section>;
}
