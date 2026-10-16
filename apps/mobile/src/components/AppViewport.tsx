import { createContext, useContext } from "react";
import { useWindowDimensions } from "react-native";

export const AppViewportContext = createContext<ReturnType<typeof useWindowDimensions> | null>(null);

/** Nested workspaces use their actual content pane, not the whole Mac window. */
export function useAppViewport() {
  const window = useWindowDimensions();
  return useContext(AppViewportContext) ?? window;
}
