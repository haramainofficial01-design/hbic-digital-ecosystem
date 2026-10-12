import { NativeModule, requireOptionalNativeModule } from "expo-modules-core";
import { Platform } from "react-native";

declare class MacQuranRuntime extends NativeModule<{ onMacQuranCommand: (event: { command: string }) => void }> {
  isIOSAppOnMac: boolean;
  isMacCatalyst: boolean;
}
// A wide iPad or Vision window is not a Mac. Detect the actual native host,
// without user-agent guesses, network requests or hardware requirements.
export const macQuranRuntime = Platform.OS === "ios" ? requireOptionalNativeModule<MacQuranRuntime>("MasjidAppleBridge") : null;
export const isMacQuranHost = Boolean(macQuranRuntime?.isIOSAppOnMac || macQuranRuntime?.isMacCatalyst);
