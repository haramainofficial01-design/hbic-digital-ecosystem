import { createWidgetPrayerSnapshot, isVisibleItem, normalizeRatingCampaign } from "@hbic/shared";
import { useIsFocused } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { AppState, InteractionManager, Linking, Platform } from "react-native";
import { Alert } from "../i18n/LocalizedText";
import { useOnboarding } from "../onboarding/OnboardingProvider";
import { usePublishedContent } from "../services/content";
import { ratingIdleDelayMs, ratingIsEligible, ratingNotificationQuietMs, type RatingEligibility } from "./campaignState";
import { ratingCampaignLedger } from "./campaignStorage";
import { nativeReviewAvailable, requestNativeReview } from "./nativeReview";
import { RatingInvitation } from "./RatingInvitation";
import { openAppReview } from "./storeLinks";
import { getRatingHomeInteraction, subscribeRatingHomeInteraction } from "./homeActivity";

export function RatingCampaignHost({ homeReady }: { homeReady: boolean }) {
  const lastInteractionAt = useSyncExternalStore(subscribeRatingHomeInteraction, getRatingHomeInteraction, getRatingHomeInteraction);
  const focused = useIsFocused();
  const { active: onboarding } = useOnboarding();
  const { content, loading, source, refreshError } = usePublishedContent();
  const campaign = normalizeRatingCampaign(content.settings.ratingCampaign);
  const [foreground, setForeground] = useState(AppState.currentState === "active");
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [deferredUntil, setDeferredUntil] = useState(0);
  const [now, setNow] = useState(Date.now);
  const [visibleId, setVisibleId] = useState<string | null>(null);
  const [attemptedId, setAttemptedId] = useState<string | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", state => {
      setForeground(state === "active");
      if (state !== "active") setVisibleId(null);
      else { setNow(Date.now()); setDeferredUntil(Date.now() + ratingIdleDelayMs); }
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!campaign.enabled) { setNotificationsReady(false); return; }
    let mounted = true;
    const defer = () => {
      if (mounted) { setDeferredUntil(Date.now() + ratingNotificationQuietMs); setVisibleId(null); }
    };
    const received = Notifications.addNotificationReceivedListener(defer);
    const response = Notifications.addNotificationResponseReceivedListener(defer);
    // Finish launch-notification routing before considering an invitation.
    void Notifications.getLastNotificationResponseAsync().then(value => {
      if (!mounted) return;
      if (value) defer();
      setNotificationsReady(true);
    }).catch(() => { /* Fail closed: a launch alert may still be routing. */ });
    return () => { mounted = false; received.remove(); response.remove(); };
  }, [campaign.enabled]);

  useEffect(() => {
    if (!campaign.enabled || !foreground || !focused || (attemptedId === campaign.id && !visibleId)) return;
    // Only a pending/visible campaign needs a prayer-window clock. No per-second work.
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [campaign.enabled, campaign.id, foreground, focused, visibleId, attemptedId]);

  const snapshot = useMemo(() => campaign.enabled ? createWidgetPrayerSnapshot(content, new Date(now)) : null, [campaign.enabled, content, now]);
  const prayerTimes = [
    ...(snapshot?.prayers ?? []).filter(prayer => prayer.key !== "sunrise").flatMap(prayer => [prayer.adhanDate, prayer.iqamahDate]),
    ...(snapshot?.jumuah ?? []).flatMap(session => [session.khutbahDate, session.iqamahDate])
  ].filter((value): value is string => Boolean(value)).map(value => Date.parse(value));
  const input: RatingEligibility = {
    platform: Platform.OS, campaign, homeReady: homeReady && !loading, homeFocused: focused,
    foreground, onboarding, contentFresh: source === "api" && !refreshError
      && !content.announcements.some(item => item.urgent && isVisibleItem(item)),
    notificationCheckComplete: notificationsReady, nativeReviewAvailable, deferredUntil,
    prayerTimes, now
  };
  const current = useRef(input);
  current.current = input;
  const eligible = ratingIsEligible(input);

  useEffect(() => {
    if (!eligible) setVisibleId(null);
  }, [eligible, campaign.id]);

  useEffect(() => {
    if (!eligible || attemptedId === campaign.id) return;
    let cancelled = false;
    let interaction: ReturnType<typeof InteractionManager.runAfterInteractions> | undefined;
    const stillEligible = () => !cancelled && ratingIsEligible({ ...current.current, now: Date.now() });
    const timer = setTimeout(() => {
      interaction = InteractionManager.runAfterInteractions(() => {
        void (async () => {
          const claimed = await ratingCampaignLedger.claim(campaign.id, stillEligible);
          if (!claimed) {
            if (stillEligible()) setAttemptedId(campaign.id);
            return;
          }
          if (!stillEligible()) { await ratingCampaignLedger.release(campaign.id); return; }
          setAttemptedId(campaign.id);
          if (Platform.OS === "ios") {
            // Never report a request as a displayed prompt or a submitted review.
            try {
              if (!await requestNativeReview()) {
                await ratingCampaignLedger.release(campaign.id);
              }
            } catch { /* Unknown outcome: retain the claim to avoid repeated prompts. */ }
          } else { setVisibleId(campaign.id); }
        })();
      });
    }, Math.max(ratingIdleDelayMs, lastInteractionAt + ratingIdleDelayMs - Date.now()));
    return () => { cancelled = true; clearTimeout(timer); interaction?.cancel(); };
  }, [eligible, campaign.id, attemptedId, lastInteractionAt, deferredUntil]);

  // Disabling/changing a published campaign hides an already-open invitation too.
  const visible = Platform.OS === "android" && eligible && visibleId === campaign.id;
  if (Platform.OS !== "android") return null;
  return <RatingInvitation visible={visible} onDismiss={() => setVisibleId(null)} onRate={() => {
    setVisibleId(null);
    void openAppReview(Platform.OS, url => Linking.openURL(url)).catch(() => {
      Alert.alert("Couldn't open the store", "Please try Rate Our App again when you are connected.");
    });
  }} />;
}
