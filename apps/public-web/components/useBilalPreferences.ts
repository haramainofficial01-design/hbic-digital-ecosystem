"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { BilalTourLedger, bilalTourQuiet, supportedLanguages, type LanguageCode } from "@hbic/shared";

const ledger = new BilalTourLedger({ read: async () => localStorage.getItem("hbic-bilal-tour"), write: async value => { if (value === null) localStorage.removeItem("hbic-bilal-tour"); else localStorage.setItem("hbic-bilal-tour", value); } });
const validLanguage = (value: string | null): value is LanguageCode => supportedLanguages.some(item => item.code === value);
export function useBilalPreferences({ eligible, open, onOpen }: { eligible: boolean; open: boolean; onOpen(): void }) {
  const [language, setLanguageState] = useState<LanguageCode>("en"), [seen, setSeen] = useState<boolean | null>(null), [tourStep, setTourStep] = useState<number | null>(null);
  const lastInteraction = useRef(Date.now()), callback = useRef(onOpen); callback.current = onOpen;
  useEffect(() => {
    let mounted = true;
    void ledger.seen().then(value => { if (mounted) setSeen(value); });
    function readLanguage() {
      let selected = new URLSearchParams(location.search).get("lang");
      try { selected ??= sessionStorage.getItem("hbic-interface-language") ?? localStorage.getItem("hbic-bilal-language"); } catch { /* Settings remain usable in memory. */ }
      const html = document.documentElement.lang;
      if (!selected) selected = html.startsWith("ar") ? "ar" : html.startsWith("ur") ? "ur" : html.startsWith("fa") ? "fa-AF" : "en";
      if (validLanguage(selected)) setLanguageState(selected);
    }
    readLanguage(); const observer = new MutationObserver(readLanguage); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    window.addEventListener("storage", readLanguage);
    return () => { mounted = false; observer.disconnect(); window.removeEventListener("storage", readLanguage); };
  }, []);
  useEffect(() => {
    const note = () => { lastInteraction.current = Date.now(); };
    document.addEventListener("pointerdown", note, { passive: true }); document.addEventListener("keydown", note);
    return () => { document.removeEventListener("pointerdown", note); document.removeEventListener("keydown", note); };
  }, []);
  useEffect(() => {
    if (!eligible || open || seen !== false) return;
    let cancelled = false; const controller = new AbortController();
    async function check() {
      if (document.visibilityState !== "visible" || document.querySelector('[aria-modal="true"]') || /^(?:INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName ?? "")) return;
      try {
        const response = await fetch("/api/content/prayer-snapshot", { cache: "no-store", credentials: "omit", signal: controller.signal }), value = await response.json(), snapshot = value.snapshot;
        if (!response.ok || !value.ok || snapshot?.availability !== "available" || snapshot.stale) return;
        const prayers = [...snapshot.prayers.filter((p: { key: string }) => p.key !== "sunrise").flatMap((p: { adhanDate?: string; iqamahDate?: string }) => [p.adhanDate, p.iqamahDate]), ...(snapshot.jumuah ?? []).flatMap((p: { khutbahDate?: string; iqamahDate?: string }) => [p.khutbahDate, p.iqamahDate])].filter(Boolean).map(Date.parse);
        if (!bilalTourQuiet({ now: Date.now(), prayerTimes: prayers, lastInteractionAt: lastInteraction.current, deferredUntil: 0 })) return;
        if (!cancelled && await ledger.claim(() => !cancelled && document.visibilityState === "visible") && !cancelled) { setSeen(true); setTourStep(0); callback.current(); }
      } catch { /* No verified current-day schedule: defer, never interrupt. */ }
    }
    const initial = setTimeout(() => void check(), 6500), timer = setInterval(() => void check(), 30_000);
    return () => { cancelled = true; controller.abort(); clearTimeout(initial); clearInterval(timer); };
  }, [eligible, open, seen]);
  useEffect(() => { if (!open) setTourStep(null); }, [open]);
  const setLanguage = useCallback((value: LanguageCode) => { setLanguageState(value); try { localStorage.setItem("hbic-bilal-language", value); } catch { /* Session selection still works. */ } }, []);
  function showTour() { setSeen(true); setTourStep(0); void ledger.markSeen(); callback.current(); }
  function finishTour() { setSeen(true); setTourStep(null); void ledger.markSeen(); }
  function closeTour() { setTourStep(null); }
  return { language, setLanguage, seen, tourStep, showTour, finishTour, closeTour, nextTourStep: () => tourStep === 2 ? finishTour() : setTourStep((tourStep ?? 0) + 1) };
}

/** Fixed panels follow the visual viewport when a mobile keyboard opens. */
export function useBilalViewport(open: boolean) {
  const [viewport, setViewport] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const visual = window.visualViewport;
    const update = () => { const next = { top: visual?.offsetTop ?? 0, height: visual?.height ?? window.innerHeight }; setViewport(current => current?.top === next.top && current.height === next.height ? current : next); };
    update(); visual?.addEventListener("resize", update); visual?.addEventListener("scroll", update); window.addEventListener("resize", update);
    return () => { visual?.removeEventListener("resize", update); visual?.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [open]);
  return viewport ? { top: viewport.top, height: viewport.height, bottom: "auto" as const } : undefined;
}
