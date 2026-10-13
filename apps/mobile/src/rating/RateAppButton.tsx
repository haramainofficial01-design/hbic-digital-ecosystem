import { useState } from "react";
import { Linking, Platform } from "react-native";
import { Alert } from "../i18n/LocalizedText";
import { AppButton } from "../components/AppButton";
import { openAppReview } from "./storeLinks";
import { normalizeRatingCampaign } from "@hbic/shared";
import { usePublishedContent } from "../services/content";
import { ratingCampaignLedger } from "./campaignStorage";

export function RateAppButton() {
  const [opening, setOpening] = useState(false);
  const { content, source, refreshError } = usePublishedContent();
  if (Platform.OS !== "ios" && Platform.OS !== "android") return null;
  return <AppButton label="Rate Our App" icon="star-outline" variant="secondary" disabled={opening} onPress={() => {
    if (opening) return;
    setOpening(true);
    void (async () => {
      // A voluntary manual store visit also satisfies the current campaign;
      // this is an attempt, never a claim that a review was submitted.
      const campaign = normalizeRatingCampaign(content.settings.ratingCampaign);
      if (source === "api" && !refreshError) await ratingCampaignLedger.claim(campaign.id, () => true);
      await openAppReview(Platform.OS, url => Linking.openURL(url));
    })().catch(() => {
      Alert.alert("Couldn't open the store", "Please try Rate Our App again when you are connected.");
    }).finally(() => setOpening(false));
  }} />;
}
