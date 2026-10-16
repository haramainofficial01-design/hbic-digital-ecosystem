import { Children, type PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { useAppViewport } from "./AppViewport";
import { spacing } from "../theme/theme";

export function AdaptiveGrid({ children, breakpoint = 760 }: PropsWithChildren<{ breakpoint?: number }>) {
  const { width, fontScale } = useAppViewport();
  const twoColumns = width >= breakpoint && fontScale <= 1.4;

  return (
    <View style={styles.grid}>
      {Children.map(children, (child) => (
        <View style={twoColumns ? styles.columnWide : styles.column}>{child}</View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    alignItems: "stretch"
  },
  column: {
    width: "100%",
    minWidth: 0
  },
  columnWide: {
    width: "48%",
    flexGrow: 1,
    minWidth: 320
  }
});
