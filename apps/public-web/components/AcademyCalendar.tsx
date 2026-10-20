"use client";

import { useState } from "react";
import { ACADEMY_TERM_END_DATE } from "@hbic/shared";
import { academyCalendarBadge, academyCalendarDateLabel, academyCalendarKind, academyCalendarMonthCells, academyCalendarMonths, academyCalendarMonthLabel, academyClassTimeLabel, academyParentCalendar, type ParentCalendarItem } from "../lib/academyCalendarView";
import styles from "./AcademyCalendar.module.css";

export function AcademyCalendar({ items, today, enrollmentStartPeriod, error, onRefresh }: {
  items: readonly ParentCalendarItem[] | null; today: string; enrollmentStartPeriod?: string | null; error: boolean; onRefresh: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const { upcoming, nextClass } = academyParentCalendar(items ?? [], today, enrollmentStartPeriod);
  const availableMonths = academyCalendarMonths(today.slice(0, 7), upcoming.at(-1)?.date.slice(0, 7) ?? today.slice(0, 7));
  const month = availableMonths.includes(selectedMonth) ? selectedMonth : nextClass?.date.slice(0, 7) ?? today.slice(0, 7);
  const activeDate = upcoming.some(item => item.date === selectedDate && item.date.startsWith(month)) ? selectedDate
    : nextClass?.date.startsWith(month) ? nextClass.date : upcoming.find(item => item.date.startsWith(month))?.date ?? `${month}-01`;
  const monthIndex = availableMonths.indexOf(month);
  const visible = expanded ? upcoming : upcoming.filter(item => item.date === activeDate);
  const months = [...new Set(visible.map(item => item.date.slice(0, 7)))];
  function changeMonth(index: number) {
    const next = availableMonths[index];
    if (!next) return;
    setSelectedMonth(next); setSelectedDate(upcoming.find(item => item.date.startsWith(next))?.date ?? `${next}-01`);
  }
  async function refresh() {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }

  return <section id="academy-calendar" className={styles.calendar} aria-labelledby="academy-calendar-title" tabIndex={-1}>
    <div className={styles.heading}><h3 id="academy-calendar-title">Academy Calendar</h3><button type="button" className={styles.refresh} disabled={refreshing} onClick={() => void refresh()} aria-label="Refresh Academy calendar">{refreshing ? "Refreshing…" : "Refresh"}</button></div>
    <p className={styles.rhythm}>Monday &amp; Thursday<span className={styles.classTime}>{academyClassTimeLabel}</span><span>Calgary time</span><span>Fun Class: last Thursday of each month.</span></p>
    {nextClass ? <div className={styles.next}><span className={styles.eyebrow}>NEXT CLASS</span><strong>{academyCalendarDateLabel(nextClass.date)}</strong><span>{academyCalendarKind(nextClass) === "changed" ? nextClass.note || "Check the updated time below." : academyClassTimeLabel}{academyCalendarKind(nextClass) === "special" ? " · Fun Class" : ""}</span></div> : items ? <p className={styles.empty}>{enrollmentStartPeriod && `${enrollmentStartPeriod}-01` > today ? "No class dates are published yet for your selected start month." : "No upcoming classes are published."}</p> : null}
    {error ? <p className={styles.warning} role="status">{items ? "Schedule could not refresh. Showing the last loaded dates." : "Calendar could not load. Please try Refresh."}</p> : items === null ? <p className={styles.empty} role="status">Loading your schedule…</p> : null}
    <div className={styles.monthNavigation}><button type="button" aria-label="Previous calendar month" disabled={monthIndex <= 0} onClick={() => changeMonth(monthIndex - 1)}>‹</button><h4 aria-live="polite">{academyCalendarMonthLabel(month)}</h4><button type="button" aria-label="Next calendar month" disabled={monthIndex >= availableMonths.length - 1} onClick={() => changeMonth(monthIndex + 1)}>›</button></div>
    <div className={styles.grid} role="group" aria-label={`${academyCalendarMonthLabel(month)} calendar`}>
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => <span key={day} className={styles.weekday}>{day}</span>)}
      {academyCalendarMonthCells(month).map((date, index) => {
        if (!date) return <span key={`blank-${index}`} aria-hidden="true" />;
        const entries = upcoming.filter(item => item.date === date);
        const kinds = entries.map(academyCalendarKind);
        const kind = (["closure", "special", "changed", "class", "event"] as const).find(value => kinds.includes(value));
        const symbol = { class: "●", special: "★", closure: "×", changed: "!", event: "•" };
        const content = <><span>{Number(date.slice(8))}</span>{kind ? <span className={styles.marker} aria-hidden="true">{symbol[kind]}</span> : null}</>;
        return entries.length ? <button type="button" key={date} className={`${styles.day} ${kind ? styles[kind] : ""} ${activeDate === date ? styles.selectedDay : ""}`} aria-pressed={activeDate === date} aria-current={date === today ? "date" : undefined} aria-label={`${academyCalendarDateLabel(date)}: ${[...new Set(entries.map(academyCalendarBadge))].join(", ")}`} onClick={() => { setSelectedDate(date); setExpanded(false); }}>{content}</button>
          : <span key={date} className={`${styles.day} ${styles.quietDay}`} aria-label={academyCalendarDateLabel(date)}>{content}</span>;
      })}
    </div>
    <div className={styles.legend}><span>● Class</span><span>★ Fun Class</span><span>× No class</span><span>! Time changed</span><span>• Update</span></div>
    <div id="academy-calendar-dates">
      {months.map(month => <div key={month} className={styles.month}><h4>{expanded ? academyCalendarMonthLabel(month) : "Selected date"}</h4><ul className={styles.dates}>
        {visible.filter(item => item.date.startsWith(month)).map(item => <li key={item.id} className={styles.dateRow}>
          <time dateTime={item.date} className={styles.dateChip}><span>{new Date(`${item.date}T12:00:00Z`).toLocaleDateString("en-CA", { month: "short", timeZone: "UTC" })}</span><strong>{Number(item.date.slice(8))}</strong></time>
          <div className={styles.detail}><span className={`${styles.badge} ${styles[academyCalendarKind(item)]}`}>{academyCalendarBadge(item)}</span><strong>{item.title}</strong><span>{academyCalendarDateLabel(item.date)}</span>
            {["class", "special"].includes(academyCalendarKind(item)) ? <span>{academyClassTimeLabel}</span> : null}
            {item.note && item.note !== "5:30–7:00 p.m." ? <p>{item.note}</p> : null}
          </div>
        </li>)}
      </ul></div>)}
    </div>
    {upcoming.length > 1 ? <button type="button" className={styles.expand} aria-expanded={expanded} aria-controls="academy-calendar-dates" onClick={() => setExpanded(!expanded)}>{expanded ? "Show selected date" : "View full schedule"}</button> : null}
    <p className={styles.term}>Final class: {academyCalendarDateLabel(ACADEMY_TERM_END_DATE)}. Ramadan/Eid break follows; the next term is to be announced.</p>
  </section>;
}
