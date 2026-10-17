"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, ArrowUpRight, RotateCcw, BookOpen } from "lucide-react";
import { bilalCompanionDisclaimer, bilalCompanionName, bilalCompanionSuggestions, bilalCompanionWelcome, companionVisibleOnRoute, safeCompanionLink, type CompanionReply } from "@hbic/shared";
import styles from "./BilalCompanion.module.css";

type Message = { id: number; role: "user" | "assistant"; text: string; reply?: CompanionReply };
type Capabilities = { enabled: boolean };

export function BilalCompanion() {
  const pathname = usePathname(), [open, setOpen] = useState(false), [caps, setCaps] = useState<Capabilities | null>(null);
  const [messages, setMessages] = useState<Message[]>([]), [draft, setDraft] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const launcher = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null), input = useRef<HTMLInputElement>(null), end = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null), serial = useRef(0), locked = useRef(false);
  const eligible = companionVisibleOnRoute(pathname);
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/assistant", { signal: abort.signal, cache: "no-store" }).then(response => response.ok ? response.json() : null)
      .then(data => { if (data?.ok && !abort.signal.aborted) setCaps({ enabled: data.enabled === true }); }).catch(() => {});
    return () => { abort.abort(); controller.current?.abort(); };
  }, []);
  useEffect(() => { setOpen(false); controller.current?.abort(); controller.current = null; locked.current = false; setBusy(false); }, [pathname]);
  useEffect(() => {
    if (!open || !eligible) return;
    const site = document.querySelector<HTMLElement>(".site"), previousInert = site?.inert ?? false, previousOverflow = document.body.style.overflow, previousLauncher = launcher.current;
    if (site) site.inert = true;
    document.body.style.overflow = "hidden";
    const frame = requestAnimationFrame(() => input.current?.focus());
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
      if (event.key !== "Tab") return;
      const targets = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href]') ?? []).filter(node => node.getClientRects().length > 0);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keydown); if (site) site.inert = previousInert; document.body.style.overflow = previousOverflow; previousLauncher?.focus(); };
  }, [open, eligible]);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: "end", behavior: "instant" }); }, [messages, busy, open]);
  useEffect(() => { if (!open) { controller.current?.abort(); controller.current = null; locked.current = false; setBusy(false); } }, [open]);

  async function send(question = draft) {
    const text = question.trim();
    if (!text || text.length > 800 || locked.current) return;
    if (messages.filter(message => message.role === "user").length >= 20) { setError("Please clear this chat to start a new conversation."); return; }
    locked.current = true; setBusy(true); setError(""); setDraft("");
    const previousQuestions = messages.filter(message => message.role === "user").slice(-4).map(message => message.text);
    setMessages(current => [...current, { id: ++serial.current, role: "user", text }]);
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 20_000);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: abort.signal,
        body: JSON.stringify({ question: text, previousQuestions }) });
      const data = await response.json();
      if (abort.signal.aborted || controller.current !== abort) return;
      if (!response.ok || !data?.ok || typeof data.answer !== "string" || !Array.isArray(data.sources)) throw Error(typeof data?.error === "string" ? data.error : "Please try again shortly.");
      setMessages(current => [...current, { id: ++serial.current, role: "assistant", text: data.answer, reply: data }]);
    } catch (reason) { if (controller.current === abort) { setDraft(text); setError(abort.signal.aborted ? "That request was interrupted. Please try again." : reason instanceof Error ? reason.message : "Please try again shortly."); } }
    finally { clearTimeout(timeout); if (controller.current === abort) { locked.current = false; setBusy(false); } }
  }

  if (!eligible || !caps?.enabled) return null;
  return <div className={styles.host}>
    <button ref={launcher} className={styles.launcher} aria-label={`Open ${bilalCompanionName}`} aria-expanded={open} aria-controls="bilal-companion-panel" onClick={() => setOpen(value => !value)}>
      <MessageCircle size={23} aria-hidden="true" /><span>Ask Bilal</span>
    </button>
    {open ? <div className={styles.overlay}>
      <button className={styles.scrim} aria-label="Close Bilal Companion" tabIndex={-1} onClick={() => setOpen(false)} />
      <section ref={panel} id="bilal-companion-panel" className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="bilal-companion-title">
        <header className={styles.header}>
          <span className={styles.mark} aria-hidden="true"><MessageCircle size={23} /></span>
          <div className={styles.heading}><h2 id="bilal-companion-title">{bilalCompanionName}</h2><p>Your Masjid Bilal companion</p></div>
          <button className={styles.iconButton} aria-label="Clear chat" disabled={busy || !messages.length} onClick={() => { setMessages([]); setError(""); setDraft(""); input.current?.focus(); }}><RotateCcw size={18} aria-hidden="true" /></button>
          <button className={styles.iconButton} aria-label="Close chat" onClick={() => setOpen(false)}><X size={21} aria-hidden="true" /></button>
        </header>
        <div className={styles.notice}><BookOpen size={15} aria-hidden="true" /><p>{bilalCompanionDisclaimer}</p></div>
        <div className={styles.messages} role="log" aria-label="Conversation" aria-relevant="additions" aria-live="polite">
          <div className={styles.assistant}><p>{bilalCompanionWelcome}</p><small>Published information · This session only</small></div>
          {!messages.length ? <div className={styles.suggestions}>{bilalCompanionSuggestions.map(question => <button key={question} onClick={() => void send(question)} disabled={busy}>{question}<ArrowUpRight size={15} aria-hidden="true" /></button>)}</div> : null}
          {messages.map(message => <div key={message.id} className={message.role === "user" ? styles.user : styles.assistant}>
            <p>{message.text}</p>
            {message.reply ? <>
              <div className={styles.sources}>{message.reply.sources.map(source => {
                const href = safeCompanionLink(source.href);
                return href ? <a key={source.id} href={href} onClick={() => setOpen(false)}>{source.title}<ArrowUpRight size={13} aria-hidden="true" /></a> : null;
              })}</div>
              <small>Published-information lookup · {new Date(message.reply.asOf).toLocaleTimeString("en-CA", { timeZone: "America/Edmonton", hour: "numeric", minute: "2-digit" })} Calgary</small>
            </> : null}
          </div>)}
          {busy ? <p className={styles.status} role="status">Checking published information…</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div ref={end} />
        </div>
        <footer className={styles.footer}>
          <form onSubmit={event => { event.preventDefault(); void send(); }} className={styles.form}>
            <label className="sr-only" htmlFor="bilal-companion-question">Your question</label>
            <input ref={input} id="bilal-companion-question" value={draft} maxLength={800} onChange={event => setDraft(event.target.value)} placeholder="Ask about Masjid Bilal…" autoComplete="off" disabled={busy} />
            <button aria-label="Send question" type="submit" disabled={busy || !draft.trim()}><Send size={19} aria-hidden="true" /></button>
          </form>
          <p className={styles.finePrint}>No chat history is saved by HBIC. <a href="/privacy#bilal-companion" onClick={() => setOpen(false)}>Privacy</a> · <a href="/contact" onClick={() => setOpen(false)}>Contact the office</a></p>
        </footer>
      </section>
    </div> : null}
  </div>;
}
