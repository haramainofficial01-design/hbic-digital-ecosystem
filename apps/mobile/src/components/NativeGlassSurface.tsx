import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useAppTheme } from "../theme/ThemeProvider";

export function NativeGlassSurface({ children, style, interactive = false }: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
}>) {
  const { theme, resolvedMode } = useAppTheme();
  const nativeGlassAvailable = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

  if (nativeGlassAvailable) {
    return (
      <GlassView
        glassEffectStyle="regular"
        isInteractive={interactive}
        tintColor={resolvedMode === "dark" ? "rgba(3,24,39,0.42)" : "rgba(255,255,255,0.2)"}
        style={style}
      >
        {children}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.fallback,
        {
          backgroundColor: Platform.OS === "android" ? theme.colors.surfaceStrong : theme.colors.cardStrong,
          borderColor: theme.colors.border
        },
        style
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    borderWidth: StyleSheet.hairlineWidth
  }
});
