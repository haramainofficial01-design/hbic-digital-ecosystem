"use client";
import { useEffect, useState } from "react";
import type { QuranChallenge } from "@hbic/shared";
const empty: QuranChallenge = { id: "", title: "", season: "community", startsAt: "", endsAt: "", rules: "", prizeDetails: "", status: "draft" };
type Participant = { uid: string; nickname: string; seconds: number };
export function QuranChallengesPanel({ adminRequest, personalSession }: { adminRequest: (path: string, init?: RequestInit) => Promise<any>; personalSession: boolean }) {
  const [events, setEvents] = useState<QuranChallenge[]>([]), [draft, setDraft] = useState<QuranChallenge>(empty);
  const [participants, setParticipants] = useState<Participant[]>([]), [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  async function action(job: () => Promise<void>) {
    if (busy) return; setBusy(true); setMessage("");
    try { await job(); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not finish."); } finally { setBusy(false); }
  }
  async function refresh() { const data = await adminRequest("/api/admin/quran/challenges"); setEvents(data.events); }
  useEffect(() => { if (personalSession) void action(refresh); }, [personalSession, adminRequest]); // eslint-disable-line react-hooks/exhaustive-deps
  const localDate = (value: string) => value ? new Date(Date.parse(value) - new Date(value).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  return <div className="stack">
    <div className="card"><h2>Quran Community Challenges</h2><p className="muted">Optional adult nickname/practice-time rankings. Private recordings, recognized words and Academy data are never published. Ramadan and Dhul Hijjah dates must be set explicitly by HBIC; no automatic festival or prize promises.</p>
      {!personalSession ? <p role="alert">Sign in with an approved director or super administrator’s personal account.</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <div className="actions"><button className="secondary" disabled={busy || !personalSession} onClick={() => void action(refresh)}>Refresh events</button><button className="secondary" onClick={() => { setDraft(empty); setApproved(false); setParticipants([]); }}>New draft event</button></div>
      {events.map(event => <button className="secondary" key={event.id} onClick={() => { setDraft(event); setApproved(false); setParticipants([]); }}>{event.title} · {event.status}</button>)}
    </div>
    <form className="card" onSubmit={e => { e.preventDefault(); void action(async () => { await adminRequest("/api/admin/quran/challenges", { method: "POST", body: JSON.stringify({ event: draft, prizeApproved: approved }) }); await refresh(); setMessage(draft.status === "published" ? "Event published. Prize eligibility still requires staff review; no reward is paid automatically." : "Private draft saved. Not advertised to app users."); }); }}>
      <h3>Dates, rules &amp; staff approval</h3>
      <div className="form-grid"><label>Event ID<input required maxLength={60} pattern="[a-z0-9][a-z0-9-]{2,59}" value={draft.id} onChange={e => setDraft({ ...draft, id: e.target.value })} placeholder="ramadan-practice-2027" /></label>
        <label>Title<input required maxLength={100} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
        <label>Season<select value={draft.season} onChange={e => setDraft({ ...draft, season: e.target.value as QuranChallenge["season"] })}><option value="community">Community</option><option value="ramadan">Ramadan</option><option value="dhul-hijjah">First ten days of Dhul Hijjah</option></select></label>
        <label>Visibility<select value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as QuranChallenge["status"] })}><option value="draft">Private / participation paused</option><option value="published">Published</option></select></label>
        <label>Starts<input required type="datetime-local" value={localDate(draft.startsAt)} onChange={e => setDraft({ ...draft, startsAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></label>
        <label>Ends<input required type="datetime-local" value={localDate(draft.endsAt)} onChange={e => setDraft({ ...draft, endsAt: e.target.value ? new Date(e.target.value).toISOString() : "" })} /></label>
      </div>
      <p className="muted">Dates use your browser’s local timezone and are stored as exact UTC instants. Confirm Calgary dates before publishing. Once an event starts, its scoring window, rules and prizes cannot silently change.</p>
      <label>Published participation and eligibility rules<textarea required minLength={30} maxLength={5000} rows={6} value={draft.rules} onChange={e => setDraft({ ...draft, rules: e.target.value })} /></label>
      <label>Prize details (optional; empty means no published prize)<textarea maxLength={1500} rows={3} value={draft.prizeDetails} onChange={e => { setDraft({ ...draft, prizeDetails: e.target.value }); setApproved(false); }} /></label>
      {draft.prizeDetails ? <label><input type="checkbox" checked={approved} onChange={e => setApproved(e.target.checked)} /> I am authorized to approve these specific prize details and eligibility rules for HBIC.</label> : null}
      <button className="primary" disabled={busy || !personalSession || draft.status === "published" && Boolean(draft.prizeDetails) && !approved}>{busy ? "Working…" : draft.status === "published" ? "Publish approved event" : "Save private draft"}</button>
    </form>
    {draft.id ? <div className="card"><h3>Review public standings</h3><p className="muted">Practice time is server-timed foreground activity, not a verified recitation grade. Do not award prizes automatically from the score. Suspicious or unsuitable public nicknames can be removed here.</p>
      <button className="secondary" disabled={busy || !personalSession} onClick={() => void action(async () => { const data = await adminRequest(`/api/admin/quran/challenges?id=${draft.id}`); setParticipants(data.participants); })}>Load participants</button>
      {participants.map(item => <div className="actions" key={item.uid}><strong>{item.nickname} · {Math.floor(item.seconds / 60)} min</strong><button className="secondary" disabled={busy} onClick={() => { if (window.confirm(`Remove ${item.nickname}'s standing from this event? Private Quran data is unaffected.`)) void action(async () => { await adminRequest("/api/admin/quran/challenges", { method: "POST", body: JSON.stringify({ action: "removeParticipant", eventId: draft.id, uid: item.uid }) }); setParticipants(items => items.filter(p => p.uid !== item.uid)); }); }}>Remove standing</button></div>)}
    </div> : null}
  </div>;
}
