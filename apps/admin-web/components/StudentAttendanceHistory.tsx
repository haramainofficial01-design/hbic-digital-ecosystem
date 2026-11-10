"use client";
import { useEffect, useRef, useState } from "react";
type History = { records: { date: string; status: string }[]; counts: { present: number; absent: number; excused: number } };
export function StudentAttendanceHistory({ student, adminRequest, onClose }: { student: { familyId: string; childId: string; name: string }; adminRequest: (path: string) => Promise<Record<string, any>>; onClose: () => void }) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => { panel.current?.focus({ preventScroll: true }); panel.current?.scrollIntoView({ block: "start" }); }, [student.familyId, student.childId]);
  const [data, setData] = useState<History | null>(null), [error, setError] = useState("");
  useEffect(() => {
    let active = true; setData(null); setError("");
    adminRequest(`/api/admin/academy/student-attendance?familyId=${encodeURIComponent(student.familyId)}&childId=${encodeURIComponent(student.childId)}`)
      .then(result => { if (active) setData(result as History); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Could not load attendance."); });
    return () => { active = false; };
  }, [adminRequest, student.familyId, student.childId]);
  return <section ref={panel} tabIndex={-1} style={{ scrollMarginTop: 180 }} className="academy-admin-card" aria-label={`Attendance history for ${student.name}`}>
    <div className="academy-admin-actions"><h3>{student.name} · Attendance history</h3><button type="button" className="secondary" onClick={onClose}>Close history</button></div>
    {error ? <p role="alert">{error}</p> : !data ? <p role="status">Loading attendance…</p> : <>
      <p>{data.counts.present} present · {data.counts.absent} absent · {data.counts.excused} excused</p>
      {data.records.length ? <ul>{data.records.map(row => <li key={row.date}><time dateTime={row.date}>{new Intl.DateTimeFormat("en-CA", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${row.date}T12:00:00Z`))}</time> · {row.status[0].toUpperCase() + row.status.slice(1)}</li>)}</ul> : <p>No attendance has been recorded for this student.</p>}
      <small>Recorded class dates only. Unmarked dates are not counted as absences.</small>
    </>}
  </section>;
}
