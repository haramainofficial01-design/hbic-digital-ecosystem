"use client";

import { useState } from "react";
import { ACADEMY_TERM_END_DATE } from "@hbic/shared";
import { academyCalendarBadge, academyCalendarDateLabel, academyCalendarKind, academyCalendarMonthLabel, academyClassTimeLabel, academyParentCalendar, type ParentCalendarItem } from "../lib/academyCalendarView";
import styles from "./AcademyCalendar.module.css";

export function AcademyCalendar({ items, today, enrollmentStartPeriod, error, onRefresh }: {
  items: readonly ParentCalendarItem[] | null; today: string; enrollmentStartPeriod?: string | null; error: boolean; onRefresh: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { upcoming, nextClass } = academyParentCalendar(items ?? [], today, enrollmentStartPeriod);
  const visible = expanded ? upcoming : upcoming.slice(0, 4);
  const months = [...new Set(visible.map(item => item.date.slice(0, 7)))];
  async function refresh() {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }

  return <section id="academy-calendar" className={styles.calendar} aria-labelledby="academy-calendar-title" tabIndex={-1}>
    <div className={styles.heading}><h3 id="academy-calendar-title">Academy Calendar</h3><button type="button" className={styles.refresh} disabled={refreshing} onClick={() => void refresh()} aria-label="Refresh Academy calendar">{refreshing ? "Refreshing…" : "Refresh"}</button></div>
    <p className={styles.rhythm}>Monday &amp; Thursday · {academyClassTimeLabel}<span>Calgary time</span></p>
    {nextClass ? <div className={styles.next}><span className={styles.eyebrow}>NEXT CLASS</span><strong>{academyCalendarDateLabel(nextClass.date)}</strong><span>{academyCalendarKind(nextClass) === "changed" ? nextClass.note || "Check the updated time below." : academyClassTimeLabel}{academyCalendarKind(nextClass) === "special" ? " · Special Thursday" : ""}</span></div> : items ? <p className={styles.empty}>{enrollmentStartPeriod && `${enrollmentStartPeriod}-01` > today ? "No class dates are published yet for your selected start month." : "No upcoming classes are published."}</p> : null}
    {error ? <p className={styles.warning} role="status">{items ? "Schedule could not refresh. Showing the last loaded dates." : "Calendar could not load. Please try Refresh."}</p> : items === null ? <p className={styles.empty} role="status">Loading your schedule…</p> : null}
    <div id="academy-calendar-dates">
      {months.map(month => <div key={month} className={styles.month}><h4>{academyCalendarMonthLabel(month)}</h4><ul className={styles.dates}>
        {visible.filter(item => item.date.startsWith(month)).map(item => <li key={item.id} className={styles.dateRow}>
          <time dateTime={item.date} className={styles.dateChip}><span>{new Date(`${item.date}T12:00:00Z`).toLocaleDateString("en-CA", { month: "short", timeZone: "UTC" })}</span><strong>{Number(item.date.slice(8))}</strong></time>
          <div className={styles.detail}><span className={`${styles.badge} ${styles[academyCalendarKind(item)]}`}>{academyCalendarBadge(item)}</span><strong>{item.title}</strong><span>{academyCalendarDateLabel(item.date)}</span>
            {["class", "special"].includes(academyCalendarKind(item)) ? <span>{academyClassTimeLabel}</span> : null}
            {item.note && item.note !== "5:30–7:00 p.m." ? <p>{item.note}</p> : null}
          </div>
        </li>)}
      </ul></div>)}
    </div>
    {upcoming.length > 4 ? <button type="button" className={styles.expand} aria-expanded={expanded} aria-controls="academy-calendar-dates" onClick={() => setExpanded(!expanded)}>{expanded ? "Show upcoming dates" : "View full schedule"}</button> : null}
    <p className={styles.term}>Final class: {academyCalendarDateLabel(ACADEMY_TERM_END_DATE)}. Ramadan/Eid break follows; the next term is to be announced.</p>
  </section>;
}
