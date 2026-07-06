import type { PropsWithChildren } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { spacing } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";

export function AppScreen({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const { theme } = useAppTheme();

  return (
    <LinearGradient colors={theme.gradients.screen} style={styles.gradient}>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView contentContainerStyle={[styles.content, style]} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1
  },
  safe: {
    flex: 1
  },
  content: {
    padding: spacing.md,
    paddingBottom: 120,
    gap: spacing.md
  }
});
