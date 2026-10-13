import { Children, type PropsWithChildren } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { isMacQuranHost } from "../quran/macRuntime";
import { desktopAppLayout } from "./desktopLayout";
import { spacing } from "../theme/theme";

/** Balanced Mac sections; keep the existing phone/tablet content order. */
export function DesktopColumns({ children }: PropsWithChildren) {
  const { width, fontScale } = useWindowDimensions();
  const columns = desktopAppLayout(width, isMacQuranHost, fontScale).columns;
  return (
    <View style={[styles.stack, columns === 2 && styles.row]}>
      {Children.toArray(children).map((child, index) => (
        <View key={index} style={columns === 2 ? styles.column : undefined}>{child}</View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  stack: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "stretch" },
  column: { flex: 1, minWidth: 0 }
});
