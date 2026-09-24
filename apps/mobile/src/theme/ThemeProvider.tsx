import * as FileSystem from "expo-file-system/legacy";
import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { type AppTheme, type AppThemeMode, darkTheme, lightTheme } from "./theme";

interface ThemeContextValue {
  theme: AppTheme;
  mode: AppThemeMode;
  resolvedMode: "light" | "dark";
  setMode: (mode: AppThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const themeFile = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}hbic-theme-mode.txt` : "";

function isThemeMode(value: string | null | undefined): value is AppThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [mode, setStoredMode] = useState<AppThemeMode>("system");

  useEffect(() => {
    let mounted = true;
    async function loadMode() {
      if (!themeFile) return;
      try {
        const info = await FileSystem.getInfoAsync(themeFile);
        if (!info.exists) return;
        const saved = (await FileSystem.readAsStringAsync(themeFile)).trim();
        if (mounted && isThemeMode(saved)) setStoredMode(saved);
      } catch {
        // Keep the default System mode if local preference storage is unavailable.
      }
    }
    loadMode();
    return () => {
      mounted = false;
    };
  }, []);

  const setMode = useCallback(async (nextMode: AppThemeMode) => {
    setStoredMode(nextMode);
    if (!themeFile) return;
    try {
      await FileSystem.writeAsStringAsync(themeFile, nextMode);
    } catch {
      // The UI can still update immediately even if persistence fails.
    }
  }, []);

  const resolvedMode = mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;
  const theme = resolvedMode === "dark" ? darkTheme : lightTheme;

  const value = useMemo(
    () => ({
      theme,
      mode,
      resolvedMode,
      setMode
    }),
    [mode, resolvedMode, setMode, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useAppTheme must be used inside ThemeProvider");
  return value;
}
