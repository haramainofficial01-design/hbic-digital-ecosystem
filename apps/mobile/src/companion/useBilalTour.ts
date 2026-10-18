import { bilalTourQuiet, createWidgetPrayerSnapshot, isVisibleItem } from "@hbic/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePublishedContent } from "../services/content";
import { bilalTourLedger } from "./tourStorage";
import { getRatingHomeInteraction } from "../rating/homeActivity";

export function useBilalTour({ eligible, open, onboarding, onOpen }: { eligible: boolean; open: boolean; onboarding: boolean; onOpen(): void }) {
  const { content, source, refreshError } = usePublishedContent();
  const [seen, setSeen] = useState<boolean | null>(null), [step, setStep] = useState<number | null>(null);
  const interaction = useRef(Date.now()), deferredUntil = useRef(0), callback = useRef(onOpen); callback.current = onOpen;
  useEffect(() => { let mounted = true; void bilalTourLedger.seen().then(value => { if (mounted) setSeen(value); }); return () => { mounted = false; }; }, [onboarding]);
  const noteInteraction = useCallback(() => { interaction.current = Date.now(); }, []);
  const defer = useCallback(() => { deferredUntil.current = Date.now() + 120_000; setStep(null); }, []);
  useEffect(() => {
    if (!eligible || open || seen !== false || source !== "api" || refreshError) return;
    let cancelled = false;
    async function check() {
      const now = Date.now(), snapshot = createWidgetPrayerSnapshot(content, new Date(now));
      if (snapshot.availability !== "available" || snapshot.stale) return;
      const prayerTimes = [...snapshot.prayers.filter(p => p.key !== "sunrise").flatMap(p => [p.adhanDate, p.iqamahDate]), ...snapshot.jumuah.flatMap(p => [p.khutbahDate, p.iqamahDate])].filter((x): x is string => Boolean(x)).map(Date.parse);
      const recentUrgentAt = Math.max(0, ...content.announcements.filter(n => n.urgent && isVisibleItem(n)).map(n => Date.parse(n.publishedAt)));
      if (!bilalTourQuiet({ now, prayerTimes, lastInteractionAt: Math.max(interaction.current, getRatingHomeInteraction()), deferredUntil: deferredUntil.current, recentUrgentAt })) return;
      if (!cancelled && await bilalTourLedger.claim(() => !cancelled) && !cancelled) { setSeen(true); setStep(0); callback.current(); }
    }
    const initial = setTimeout(() => void check(), 6500), timer = setInterval(() => void check(), 30_000);
    return () => { cancelled = true; clearTimeout(initial); clearInterval(timer); };
  }, [eligible, open, seen, source, refreshError, content]);
  useEffect(() => { if (!open) setStep(null); }, [open]);
  function start() { noteInteraction(); setStep(0); setSeen(true); void bilalTourLedger.markSeen(); callback.current(); }
  function finish() { setStep(null); setSeen(true); noteInteraction(); void bilalTourLedger.markSeen(); }
  return { step, seen, start, finish, next: () => step === 2 ? finish() : setStep((step ?? 0) + 1), noteInteraction, defer };
}
