import * as FileSystem from "expo-file-system/legacy";
import { RatingCampaignLedger } from "./campaignState";

const file = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-rating-campaigns.json` : null;

export const ratingCampaignLedger = new RatingCampaignLedger({
  async read() {
    if (!file) throw new Error("Rating campaign storage is unavailable");
    const info = await FileSystem.getInfoAsync(file);
    return info.exists ? FileSystem.readAsStringAsync(file) : null;
  },
  async write(value) {
    if (!file) throw new Error("Rating campaign storage is unavailable");
    await FileSystem.writeAsStringAsync(file, value);
  }
});
