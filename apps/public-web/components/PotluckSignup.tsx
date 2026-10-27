"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Check, ChevronRight, Plus, RefreshCw, X } from "lucide-react";
import { potluckEvent, potluckItems, type PotluckView } from "../lib/potluckModel";
import styles from "./PotluckSignup.module.css";

const initial: PotluckView = { event: potluckEvent, open: true, items: [...potluckItems], entries: [], mySuggestions: [] };
type Form = { id: string; itemId: string; name: string; quantity: string; title: string };

export function PotluckSignup() {
  const [data, setData] = useState(initial), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form | null>(null), [message, setMessage] = useState(""), [error, setError] = useState("");
  const lastRead = useRef(0), active = useRef(true), formRef = useRef<HTMLFormElement>(null);
  const refresh = useCallback(async (keepError = false) => {
    try {
      const response = await fetch("/api/potluck", { cache: "no-store" }); const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error ?? "The list could not load. Please refresh.");
      if (active.current) { setData(result); setLoaded(true); if (!keepError) setError(""); lastRead.current = Date.now(); }
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : "The list could not load. Please refresh."); }
  }, []);
  useEffect(() => {
    active.current = true; void refresh();
    const resume = () => { if (document.visibilityState === "visible" && Date.now() - lastRead.current > 30_000) void refresh(); };
    window.addEventListener("focus", resume); document.addEventListener("visibilitychange", resume);
    return () => { active.current = false; window.removeEventListener("focus", resume); document.removeEventListener("visibilitychange", resume); };
  }, [refresh]);
  useEffect(() => { if (form) formRef.current?.querySelector<HTMLInputElement>("input")?.focus({ preventScroll: true }); }, [form?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  function open(itemId: string, entry?: PotluckView["entries"][number]) {
    let remembered = ""; try { remembered = localStorage.getItem("hbic-potluck-first-name") ?? ""; } catch { /* Optional convenience. */ }
    setForm({ id: entry?.id ?? crypto.randomUUID(), itemId, name: entry?.name ?? remembered, quantity: entry?.quantity ?? "", title: "" }); setMessage(""); setError("");
  }
  async function submit(action: "save" | "suggest" | "remove", entryId?: string) {
    if (busy) return; setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/potluck", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action === "remove" ? { action, id: entryId } : { ...form, action }) });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        if (response.status === 409) await refresh(true);
        throw new Error(result.error ?? "Your entry could not be saved. Please try again.");
      }
      setData(result); if (form?.name) { try { localStorage.setItem("hbic-potluck-first-name", form.name); } catch { /* Not required for saving. */ } }
      setForm(null); setMessage(action === "suggest" ? "Suggestion sent for approval." : action === "remove" ? "Your name has been removed." : "You’re on the list. Thank you!");
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  function editor(itemId: string, example: string) {
    if (form?.itemId !== itemId) return null;
    return <form ref={formRef} className={styles.form} onSubmit={e => { e.preventDefault(); void submit(itemId === "suggest" ? "suggest" : "save"); }}>
      {itemId === "suggest" && <label className={styles.wide}>Item<input required maxLength={70} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What would you like to bring?" /></label>}
      <label>First name <small>Shown on the list</small><input required maxLength={40} autoComplete="given-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Quantity<input required maxLength={60} value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder={example} /></label>
      {itemId === "suggest" && <p className={styles.wide}>Visible after staff approval.</p>}
      <div className={styles.formActions}><button className={styles.primary} disabled={busy}>{busy ? "Saving…" : itemId === "suggest" ? "Send suggestion" : "Save my name"}<Check size={17} aria-hidden="true" /></button><button className={styles.cancel} type="button" disabled={busy} onClick={() => setForm(null)}>Cancel</button></div>
    </form>;
  }
  return <main className={styles.page}>
    <div className={styles.sheet}>
      <header className={styles.brand}>
        <div className={styles.seal} role="img" aria-label="HBIC Qur’an Academy, Masjid Bilal, Calgary">
          <svg viewBox="0 0 220 220" aria-hidden="true"><defs><path id="potluck-seal-top" d="M19,110 A91,91 0 0,1 201,110" /><path id="potluck-seal-bottom" d="M19,110 A91,91 0 0,0 201,110" /></defs><text><textPath href="#potluck-seal-top" startOffset="50%" textAnchor="middle">HBIC QUR’AN ACADEMY</textPath></text><text><textPath href="#potluck-seal-bottom" startOffset="50%" textAnchor="middle">MASJID BILAL · CALGARY</textPath></text></svg>
          <Image src="/brand/hbic-logo.png" alt="" width={54} height={54} unoptimized priority />
        </div>
        <div><strong>HBIC Qur’an Academy</strong><span>Masjid Bilal · Calgary</span></div>
        <a href="/quran-academy" aria-label="Qur’an Academy website"><ArrowUpRight size={20} aria-hidden="true" /></a>
      </header>
      <section className={styles.intro} aria-labelledby="potluck-title">
        <h1 id="potluck-title">Class party<br /><em>potluck.</em></h1>
        <div className={styles.details}><p><strong>Thursday, October 29</strong><span>5:30–7:30 PM</span></p><p><strong>35–40 people</strong><span>One shared list</span></p></div>
      </section>
      <aside className={styles.note}><p>Halal food, easy to serve. Please avoid sauces and messy, crumbly foods.</p><p>If possible, bring food in <strong>two separate dishes</strong> for the brothers’ and sisters’ sides.</p></aside>
      <div className={styles.listHeading}><h2>{data.open ? "What are you bringing?" : "Signups are closed"}</h2><button className={styles.refresh} disabled={busy} onClick={() => void refresh()} aria-label="Refresh signup list"><RefreshCw size={17} aria-hidden="true" /></button></div>
      {data.open && <p className={styles.listHint}>One signup for supplies, two for food and drinks. Covered items close automatically.</p>}
      <div aria-live="polite" role="status" className={message ? styles.success : styles.srOnly}>{message ? <><Check size={18} aria-hidden="true" />{message}</> : ""}</div>
      {error && <div className={styles.error} role="alert">{error}<button onClick={() => void refresh()}>Refresh list</button></div>}
      {!loaded && !error && <p className={styles.loading} role="status">Loading the list…</p>}
      {loaded && <div className={styles.list}>{["Food", "Drinks", "Table essentials", "Suggestions"].map(category => {
        const items = data.items.filter(item => item.category === category); if (!items.length) return null;
        return <section className={styles.group} key={category} aria-label={category}><h3>{category}</h3>{items.map(item => {
          const entries = data.entries.filter(e => e.itemId === item.id);
          const remaining = Math.max(0, item.maxSignups - entries.length), full = remaining === 0, mine = entries.some(e => e.mine);
          return <article className={styles.item} key={item.id}><div className={styles.itemHeading}><div className={styles.itemTitle}><h4>{item.title}</h4>{data.open && !full && <p>{remaining} {remaining === 1 ? "spot" : "spots"} left</p>}</div>{data.open && (full ? <span className={styles.covered}><Check size={16} aria-hidden="true" />Covered</span> : !mine && <button className={styles.add} disabled={busy} aria-expanded={form?.itemId === item.id} onClick={() => open(item.id)}><Plus size={17} aria-hidden="true" /><span>Add my name</span></button>)}</div>
            {entries.length > 0 && <ul className={styles.names}>{entries.map(entry => <li key={entry.id}><span><strong>{entry.name}</strong><span className={styles.quantity}>{entry.quantity}</span></span>{entry.mine && data.open && <span className={styles.entryActions}><button disabled={busy} onClick={() => open(item.id, entry)}>Edit</button><button disabled={busy} aria-label={`Remove my ${item.title.toLowerCase()} signup`} onClick={() => void submit("remove", entry.id)}><X size={15} aria-hidden="true" /></button></span>}</li>)}</ul>}
            {(!full || mine) && editor(item.id, item.example)}
          </article>;
        })}</section>;
      })}</div>}
      {loaded && data.open && <section className={styles.suggestion}><div><h2>Something else?</h2><p>Suggest an item for staff to approve.</p></div><button className={styles.suggestButton} disabled={busy} aria-expanded={form?.itemId === "suggest"} onClick={() => open("suggest")}>Suggest an item<ChevronRight size={17} aria-hidden="true" /></button>{editor("suggest", "Quantity or servings")}
        {data.mySuggestions.length > 0 && <ul className={styles.pending}>{data.mySuggestions.map(s => <li key={s.id}><span>{s.title}</span><span>{s.status === "pending" ? "Awaiting approval" : s.status === "approved" ? "Approved" : "Not approved"}</span></li>)}</ul>}
      </section>}
      <footer className={styles.footer}><span>Thursday, October 29, 2026</span><span>JazakumAllahu Khairan.</span></footer>
    </div>
  </main>;
}
