"use client";
import { useCallback, useEffect, useState } from "react";
import { potluckEvent, type PotluckEntry, type PotluckSuggestion } from "../../public-web/lib/potluckModel";
type Data = { items: { id: string; title: string }[]; entries: Omit<PotluckEntry, "owner">[]; suggestions: Omit<PotluckSuggestion, "owner">[] };
export function PotluckPanel({ adminRequest, personalSession }: { adminRequest: (path: string, init?: RequestInit) => Promise<any>; personalSession: boolean }) {
  const [data, setData] = useState<Data | null>(null), [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const load = useCallback(async () => { try { setData(await adminRequest("/api/admin/potluck")); } catch (e) { setMessage(e instanceof Error ? e.message : "Could not load the list."); } }, [adminRequest]);
  useEffect(() => {
    let current = true; setData(null);
    if (personalSession) void adminRequest("/api/admin/potluck").then(result => { if (current) setData(result); }).catch(e => { if (current) setMessage(e instanceof Error ? e.message : "Could not load the list."); });
    return () => { current = false; };
  }, [personalSession, adminRequest]);
  async function action(action: string, id: string) {
    if (busy) return; setBusy(true); setMessage("");
    try { await adminRequest("/api/admin/potluck", { method: "POST", body: JSON.stringify({ action, id }) }); await load(); setMessage(action === "approve" ? "Approved." : action === "reject" ? "Declined." : "Removed."); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Could not save."); } finally { setBusy(false); }
  }
  const pending = data?.suggestions.filter(s => s.status === "pending") ?? [];
  return <div className="stack"><section className="card"><h2>Class party potluck</h2><p>{potluckEvent.date} · {potluckEvent.time} · {potluckEvent.attendance}</p><div className="actions"><a href="https://hbic.ca/potluck" target="_blank" rel="noreferrer">Open signup page ↗</a><button className="secondary" disabled={busy || !personalSession} onClick={() => void load()}>Refresh</button></div>{!personalSession && <p role="alert">Sign in with an approved Academy staff account.</p>}{message && <p role="status">{message}</p>}</section>
    {personalSession && <section className="card"><h3>Suggestions {pending.length ? `(${pending.length})` : ""}</h3><p>Approve only halal, easy-to-serve food without sauces or messy crumbs.</p>{data && pending.length === 0 && <p>No suggestions awaiting approval.</p>}{pending.map(s => <div key={s.id} style={{ padding: "18px 0", borderTop: "1px solid var(--line)" }}><strong>{s.title}</strong><p>{s.name} · {s.quantity}</p><div className="actions"><button className="primary" disabled={busy} onClick={() => void action("approve", s.id)}>Approve</button><button className="secondary" disabled={busy} onClick={() => void action("reject", s.id)}>Decline</button></div></div>)}</section>}
    {personalSession && data && <section className="card"><h3>Signups</h3>{!data.entries.length && <p>No signups yet.</p>}{data.items.map(item => { const entries = data.entries.filter(e => e.itemId === item.id); if (!entries.length) return null; return <div key={item.id} style={{ padding: "16px 0", borderTop: "1px solid var(--line)" }}><h4>{item.title}</h4>{entries.map(e => <div className="actions" key={e.id}><span>{e.name} · {e.quantity}</span><button className="secondary" disabled={busy} onClick={() => { if (window.confirm(`Remove ${e.name}’s signup for ${item.title}?`)) void action("remove", e.id); }}>Remove</button></div>)}</div>; })}</section>}
  </div>;
}
