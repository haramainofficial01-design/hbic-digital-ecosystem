import { Ionicons } from "@expo/vector-icons";
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from "expo-glass-effect";
import type { PropsWithChildren } from "react";
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { Text } from "../i18n/LocalizedText";
import { useAppTheme } from "../theme/ThemeProvider";
export function QuranSurface({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { theme } = useAppTheme();
  const glass = Platform.OS === "ios" && isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  const contentStyle = [styles.surface, { backgroundColor: glass ? undefined : theme.colors.cardStrong, borderColor: theme.colors.border }, style];
  return glass ? <GlassView glassEffectStyle="regular" colorScheme={theme.mode} style={contentStyle}>{children}</GlassView>
    : <View style={contentStyle}>{children}</View>;
}
export function QuranIconButton({ label, icon, onPress, disabled = false, active = false }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean; active?: boolean;
}) {
  const { theme } = useAppTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled, selected: active }} disabled={disabled}
    onPress={onPress} style={({ pressed }) => [styles.icon, { backgroundColor: active ? theme.colors.tintSoft : "transparent", opacity: disabled ? .4 : pressed ? .65 : 1 }]}>
    <Ionicons name={icon} size={23} color={active ? theme.colors.teal : theme.colors.text} />
  </Pressable>;
}
export function QuranMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { theme } = useAppTheme();
  return <QuranSurface style={styles.message}><Ionicons name="cloud-offline-outline" size={28} color={theme.colors.teal} />
    <Text accessibilityRole="alert" style={[styles.messageText, { color: theme.colors.text }]}>{message}</Text>
    {onRetry ? <Pressable onPress={onRetry} accessibilityRole="button" style={styles.retry}><Text style={{ color: theme.colors.teal, fontWeight: "700", fontSize: 16 }}>Try again</Text></Pressable> : null}
  </QuranSurface>;
}
const styles = StyleSheet.create({
  surface: { borderRadius: 24, padding: 18, borderWidth: StyleSheet.hairlineWidth, marginVertical: 8 },
  icon: { minWidth: 48, minHeight: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  message: { gap: 12 }, messageText: { fontSize: 16, lineHeight: 24 }, retry: { minHeight: 44, justifyContent: "center" }
});
