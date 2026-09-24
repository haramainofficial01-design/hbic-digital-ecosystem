import { Ionicons } from "@expo/vector-icons";
import {
  Icon,
  Label,
  NativeTabs,
  VectorIcon
} from "expo-router/unstable-native-tabs";
import { useAppLanguage } from "../../src/i18n/LanguageProvider";
import { useAppTheme } from "../../src/theme/ThemeProvider";

type IconName = keyof typeof Ionicons.glyphMap;

type TabDefinition = {
  name: "index" | "prayer" | "events" | "donate" | "more";
  label: "home" | "prayer" | "events" | "donate" | "more";
  sf: {
    default: "house" | "clock" | "calendar" | "heart" | "square.grid.2x2";
    selected: "house.fill" | "clock.fill" | "calendar" | "heart.fill" | "square.grid.2x2.fill";
  };
  android: IconName;
};

const tabs: TabDefinition[] = [
  {
    name: "index",
    label: "home",
    sf: { default: "house", selected: "house.fill" },
    android: "home"
  },
  {
    name: "prayer",
    label: "prayer",
    sf: { default: "clock", selected: "clock.fill" },
    android: "time"
  },
  {
    name: "events",
    label: "events",
    sf: { default: "calendar", selected: "calendar" },
    android: "calendar"
  },
  {
    name: "donate",
    label: "donate",
    sf: { default: "heart", selected: "heart.fill" },
    android: "heart"
  },
  {
    name: "more",
    label: "more",
    sf: { default: "square.grid.2x2", selected: "square.grid.2x2.fill" },
    android: "grid"
  }
];

export default function TabLayout() {
  const { theme } = useAppTheme();
  const { t } = useAppLanguage();

  return (
    <NativeTabs
      backgroundColor={null}
      blurEffect="systemDefault"
      minimizeBehavior="onScrollDown"
      tintColor={theme.colors.teal}
      iconColor={{
        default: theme.colors.subtle,
        selected: theme.colors.teal
      }}
      labelStyle={{
        default: {
          color: theme.colors.subtle,
          fontWeight: "700"
        },
        selected: {
          color: theme.colors.teal,
          fontWeight: "800"
        }
      }}
    >
      {tabs.map((tab) => (
        <NativeTabs.Trigger key={tab.name} name={tab.name}>
          <Icon
            sf={tab.sf}
            androidSrc={<VectorIcon family={Ionicons} name={tab.android} />}
          />
          <Label>{t(tab.label)}</Label>
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
