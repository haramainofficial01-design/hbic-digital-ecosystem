export const colors = {
  navy: "#062238",
  deepNavy: "#031827",
  teal: "#087B83",
  blue: "#1268A8",
  green: "#1E9D4E",
  gold: "#E7C66B",
  cream: "#F8F4EA",
  white: "#FFFFFF",
  ink: "#10202A",
  muted: "#64748B",
  soft: "#EDF8FA",
  danger: "#B93A37"
};

export type AppThemeMode = "system" | "light" | "dark";
export type ResolvedThemeMode = "light" | "dark";

export interface AppTheme {
  mode: ResolvedThemeMode;
  colors: {
    background: string;
    backgroundAlt: string;
    card: string;
    cardStrong: string;
    surface: string;
    surfaceStrong: string;
    text: string;
    muted: string;
    subtle: string;
    border: string;
    borderStrong: string;
    tint: string;
    tintSoft: string;
    navy: string;
    deepNavy: string;
    teal: string;
    blue: string;
    gold: string;
    green: string;
    cream: string;
    white: string;
    danger: string;
    shadow: string;
  };
  gradients: {
    screen: readonly [string, string, string];
    hero: readonly [string, string];
    glass: readonly [string, string];
  };
}

export const lightTheme: AppTheme = {
  mode: "light",
  colors: {
    background: "#F2FBFC",
    backgroundAlt: "#E8F6F8",
    card: "rgba(255,255,255,0.82)",
    cardStrong: "rgba(255,255,255,0.94)",
    surface: "#FFFFFF",
    surfaceStrong: "#F4FAFB",
    text: "#10202A",
    muted: "#4E6573",
    subtle: "#5F7481",
    border: "rgba(8,123,131,0.22)",
    borderStrong: "rgba(8,123,131,0.42)",
    tint: colors.teal,
    tintSoft: "#E6F7F8",
    navy: colors.navy,
    deepNavy: colors.deepNavy,
    teal: colors.teal,
    blue: colors.blue,
    gold: colors.gold,
    green: colors.green,
    cream: colors.cream,
    white: colors.white,
    danger: colors.danger,
    shadow: "rgba(6,34,56,0.18)"
  },
  gradients: {
    screen: ["#F5FCFD", "#EAF8FA", "#F9F5EB"],
    hero: ["rgba(3,24,39,0.14)", "rgba(6,34,56,0.62)"],
    glass: ["rgba(255,255,255,0.92)", "rgba(255,255,255,0.68)"]
  }
};

export const darkTheme: AppTheme = {
  mode: "dark",
  colors: {
    background: "#031827",
    backgroundAlt: "#062238",
    card: "rgba(14,38,55,0.74)",
    cardStrong: "rgba(15,45,64,0.9)",
    surface: "#0A273D",
    surfaceStrong: "#10344A",
    text: "#F6FAFB",
    muted: "#CAD8DF",
    subtle: "#AFC1CA",
    border: "rgba(255,255,255,0.13)",
    borderStrong: "rgba(231,198,107,0.36)",
    tint: "#28C0C8",
    tintSoft: "rgba(40,192,200,0.13)",
    navy: colors.navy,
    deepNavy: colors.deepNavy,
    teal: "#28C0C8",
    blue: "#69AEE0",
    gold: colors.gold,
    green: "#5DD289",
    cream: "#FFF4D6",
    white: colors.white,
    danger: "#F06B68",
    shadow: "rgba(0,0,0,0.36)"
  },
  gradients: {
    screen: ["#03131F", "#062238", "#0B2D3E"],
    hero: ["rgba(3,24,39,0.08)", "rgba(3,24,39,0.76)"],
    glass: ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.05)"]
  }
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 34
};

export const radii = {
  md: 18,
  lg: 26,
  xl: 34
};
