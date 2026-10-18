"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Send, ArrowUpRight, RotateCcw, BookOpen, CircleHelp } from "lucide-react";
import Image from "next/image";
import { bilalCompanionDisclaimer, bilalCompanionName, bilalCompanionSuggestions, bilalCompanionWelcome, companionVisibleOnRoute, safeCompanionLink, supportedLanguages, translateUi, type LanguageCode, type CompanionReply } from "@hbic/shared";
import { BilalTour } from "./BilalTour";
import { useBilalPreferences, useBilalViewport } from "./useBilalPreferences";
import styles from "./BilalCompanion.module.css";

type Message = { id: number; role: "user" | "assistant"; text: string; question?: string; reply?: CompanionReply };
type Capabilities = { enabled: boolean };

export function BilalCompanion() {
  const pathname = usePathname(), [open, setOpen] = useState(false), [caps, setCaps] = useState<Capabilities | null>(null);
  const [messages, setMessages] = useState<Message[]>([]), [draft, setDraft] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const launcher = useRef<HTMLButtonElement>(null), panel = useRef<HTMLElement>(null), input = useRef<HTMLInputElement>(null), end = useRef<HTMLDivElement>(null);
  const controller = useRef<AbortController | null>(null), serial = useRef(0), locked = useRef(false);
  const eligible = companionVisibleOnRoute(pathname);
  const preferences = useBilalPreferences({ eligible: eligible && pathname === "/" && caps?.enabled === true, open, onOpen: () => setOpen(true) });
  const { language, tourStep } = preferences, t = (text: string) => translateUi(language, text), viewport = useBilalViewport(open);
  const [present, setPresent] = useState(false);
  const [active, setActive] = useState(true);
  useEffect(() => {
    const update = () => { const visible = document.visibilityState === "visible"; setActive(visible); if (!visible) { setOpen(false); setPresent(false); } };
    update(); document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (open) { setPresent(true); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setPresent(false); return; }
    const timer = setTimeout(() => setPresent(false), 180); return () => clearTimeout(timer);
  }, [open]);
  useEffect(() => {
    const abort = new AbortController();
    void fetch("/api/assistant", { signal: abort.signal, cache: "no-store", credentials: "omit" }).then(response => response.ok ? response.json() : null)
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
      const targets = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]') ?? []).filter(node => node.getClientRects().length > 0);
      const first = targets[0], last = targets.at(-1);
      if (event.shiftKey && (document.activeElement === first || !panel.current?.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !panel.current?.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", keydown);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("keydown", keydown); if (site) site.inert = previousInert; document.body.style.overflow = previousOverflow; previousLauncher?.focus(); };
  }, [open, eligible]);
  useEffect(() => { if (open) end.current?.scrollIntoView({ block: "end", behavior: "instant" }); }, [messages, busy, open]);
  useEffect(() => { if (!open) { controller.current?.abort(); controller.current = null; locked.current = false; setBusy(false); } }, [open]);
  useEffect(() => { if (open && tourStep === null) { const frame = requestAnimationFrame(() => input.current?.focus()); return () => cancelAnimationFrame(frame); } }, [open, tourStep]);

  async function send(question = draft, displayedQuestion = question) {
    const text = question.trim();
    if (!text || text.length > 800 || locked.current) return;
    if (messages.filter(message => message.role === "user").length >= 20) { setError(t("Please clear this chat to start a new conversation.")); return; }
    locked.current = true; setBusy(true); setError(""); setDraft("");
    const previousQuestions = messages.filter(message => message.role === "user").slice(-4).map(message => message.question ?? message.text);
    setMessages(current => [...current, { id: ++serial.current, role: "user", text: displayedQuestion.trim(), question: text }]);
    const abort = new AbortController(); controller.current = abort;
    const timeout = window.setTimeout(() => abort.abort(), 20_000);
    try {
      const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", credentials: "omit", signal: abort.signal,
        body: JSON.stringify({ question: text, previousQuestions, language }) });
      const data = await response.json();
      if (abort.signal.aborted || controller.current !== abort) return;
      if (!response.ok || !data?.ok || typeof data.answer !== "string" || !Array.isArray(data.sources)) throw Error(typeof data?.error === "string" ? data.error : "Please try again shortly.");
      setMessages(current => [...current, { id: ++serial.current, role: "assistant", text: data.answer, reply: data }]);
    } catch (reason) { if (controller.current === abort) { setDraft(text); setError(t(abort.signal.aborted ? "That request was interrupted. Please try again." : reason instanceof Error ? reason.message : "Please try again shortly.")); } }
    finally { clearTimeout(timeout); if (controller.current === abort) { locked.current = false; setBusy(false); } }
  }

  if (!eligible || !caps?.enabled) return null;
  return <div className={styles.host} data-active={active} dir={language === "en" ? "ltr" : "rtl"} lang={language}>
    <button ref={launcher} className={styles.launcher} aria-label={t("Open Bilal")} aria-expanded={open} aria-controls="bilal-companion-panel" onClick={() => { if (!open && preferences.seen === false) preferences.showTour(); else setOpen(value => !value); }}>
      <Image src="/brand/bilal-mark.svg" alt="" width={30} height={30} aria-hidden="true" /><span>{t("Ask Bilal")}</span>
    </button>
    {open || present ? <div className={`${styles.overlay} ${!open ? styles.leaving : ""}`} style={viewport} aria-hidden={!open || undefined} inert={!open}>
      <button className={styles.scrim} aria-label={t("Close chat")} tabIndex={-1} onClick={() => setOpen(false)} />
      <section ref={panel} id="bilal-companion-panel" className={styles.panel} role="dialog" aria-modal="true" aria-labelledby="bilal-companion-title">
        <header className={styles.header}>
          <Image src="/brand/bilal-mark.svg" alt="" width={42} height={42} className={styles.mark} aria-hidden="true" />
          <div className={styles.heading}><h2 id="bilal-companion-title">{t(bilalCompanionName)}</h2><p>{t("Your Masjid Bilal companion")}</p></div>
          <button className={styles.iconButton} aria-label={t("Quick tour")} disabled={tourStep !== null} onClick={preferences.showTour}><CircleHelp size={19} aria-hidden="true" /></button>
          <button className={styles.iconButton} aria-label={t("Clear chat")} disabled={busy || !messages.length || tourStep !== null} onClick={() => { setMessages([]); setError(""); setDraft(""); input.current?.focus(); }}><RotateCcw size={18} aria-hidden="true" /></button>
          <button className={styles.iconButton} aria-label={t("Close chat")} onClick={() => setOpen(false)}><X size={21} aria-hidden="true" /></button>
        </header>
        {tourStep !== null ? <BilalTour step={tourStep} language={language} onNext={preferences.nextTourStep} onSkip={() => { preferences.finishTour(); setOpen(false); }} /> : <>
        <div className={styles.notice}><BookOpen size={15} aria-hidden="true" /><p>{t(bilalCompanionDisclaimer)}</p></div>
        <div className={styles.messages} role="log" aria-label={t("Conversation")} aria-relevant="additions" aria-live="polite">
          <div className={styles.assistant}><p>{t(bilalCompanionWelcome)}</p><small>{t("Published information")} · {t("This session only")}</small></div>
          {!messages.length ? <div className={styles.suggestions}>{bilalCompanionSuggestions.map(question => <button key={question} onClick={() => void send(question, t(question))} disabled={busy}>{t(question)}<ArrowUpRight size={15} aria-hidden="true" /></button>)}</div> : null}
          {messages.map(message => <div key={message.id} className={message.role === "user" ? styles.user : styles.assistant}>
            <p>{message.text}</p>
            {message.reply ? <>
              <div className={styles.sources}>{message.reply.sources.map(source => {
                const href = safeCompanionLink(source.href);
                return href ? <a key={source.id} href={href} onClick={() => setOpen(false)}>{t(source.title)}<ArrowUpRight size={13} aria-hidden="true" /></a> : null;
              })}</div>
              <small>{t("Published information")} · {new Date(message.reply.asOf).toLocaleTimeString(language === "en" ? "en-CA" : language, { timeZone: "America/Edmonton", hour: "numeric", minute: "2-digit" })} · {t("Calgary")}</small>
            </> : null}
          </div>)}
          {busy ? <p className={styles.status} role="status">{t("Checking published information…")}</p> : null}
          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div ref={end} />
        </div>
        <footer className={styles.footer}>
          <form onSubmit={event => { event.preventDefault(); void send(); }} className={styles.form}>
            <label className="sr-only" htmlFor="bilal-companion-question">{t("Your question")}</label>
            <input ref={input} id="bilal-companion-question" value={draft} maxLength={800} onChange={event => setDraft(event.target.value)} placeholder={t("Ask about Masjid Bilal…")} autoComplete="off" disabled={busy} />
            <button aria-label={t("Send question")} type="submit" disabled={busy || !draft.trim()}><Send size={19} aria-hidden="true" /></button>
          </form>
          <p className={styles.finePrint}>{t("No chat history is saved by HBIC.")} <a href="/privacy#bilal-companion" onClick={() => setOpen(false)}>{t("Privacy")}</a> · <a href="/contact" onClick={() => setOpen(false)}>{t("Contact the office")}</a></p>
        </footer>
        </>}
        <div className={styles.languageBar}><label htmlFor="bilal-language">{t("Language")}</label><select id="bilal-language" value={language} onChange={event => preferences.setLanguage(event.target.value as LanguageCode)}>{supportedLanguages.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></div>
      </section>
    </div> : null}
  </div>;
}
