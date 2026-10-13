import { requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

interface NativeReview { requestAppReview?: () => Promise<boolean> }
const appleBridge = Platform.OS === "ios" ? requireOptionalNativeModule<NativeReview>("MasjidAppleBridge") : null;
export const nativeReviewAvailable = typeof appleBridge?.requestAppReview === "function";
/** True means requested, not that Apple displayed a dialog or a review was submitted. */
export async function requestNativeReview(): Promise<boolean> {
  return appleBridge?.requestAppReview ? appleBridge.requestAppReview() : false;
}
