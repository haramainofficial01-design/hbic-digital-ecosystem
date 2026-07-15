import { Children, type PropsWithChildren } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { spacing } from "../theme/theme";

export function AdaptiveGrid({ children, breakpoint = 760 }: PropsWithChildren<{ breakpoint?: number }>) {
  const { width } = useWindowDimensions();
  const twoColumns = width >= breakpoint;

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
    width: "100%"
  },
  columnWide: {
    width: "48%",
    flexGrow: 1,
    minWidth: 320
  }
});
