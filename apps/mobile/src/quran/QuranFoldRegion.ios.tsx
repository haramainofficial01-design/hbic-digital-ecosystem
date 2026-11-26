import { requireNativeViewManager, requireOptionalNativeModule } from "expo-modules-core";
import { StyleSheet, type ViewProps } from "react-native";
import type { QuranFoldRegionProps } from "./QuranFoldRegion";
import type { MushafGeometry } from "./mushafSpread";

const bridge = requireOptionalNativeModule<{ hasQuranFoldRegionView?: boolean; hasQuranImmersiveView?: boolean }>("MasjidAppleBridge");
const RegionView = bridge?.hasQuranFoldRegionView ? requireNativeViewManager<ViewProps & {
  immersive?: boolean;
  onRegionChange: (event: { nativeEvent: MushafGeometry }) => void;
}>("MasjidAppleBridge") : null;

export function QuranFoldRegion({ immersive, onChange }: QuranFoldRegionProps) {
  return RegionView
    ? <RegionView {...(bridge?.hasQuranImmersiveView ? { immersive } : {})} pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill} onRegionChange={(event) => onChange(event.nativeEvent)} />
    : null;
}
