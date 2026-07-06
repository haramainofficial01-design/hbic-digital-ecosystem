import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useAppTheme } from "../../src/theme/ThemeProvider";

type IconName = keyof typeof Ionicons.glyphMap;

const iconMap = {
  index: "home",
  prayer: "time",
  events: "calendar",
  donate: "heart",
  more: "grid"
} satisfies Record<string, IconName>;

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.teal,
        tabBarInactiveTintColor: theme.colors.subtle,
        tabBarStyle: {
          minHeight: 72,
          paddingTop: 8,
          backgroundColor: theme.mode === "dark" ? "rgba(4,21,34,0.96)" : "rgba(255,255,255,0.94)",
          borderTopColor: theme.colors.border
        },
        tabBarLabelStyle: {
          fontWeight: "800"
        },
        tabBarIcon: ({ color, size }) => {
          const icon = iconMap[route.name as keyof typeof iconMap] ?? "ellipse";
          return <Ionicons name={icon} color={color} size={Math.max(22, size)} />;
        }
      })}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="prayer" options={{ title: "Prayer" }} />
      <Tabs.Screen name="events" options={{ title: "Events" }} />
      <Tabs.Screen name="donate" options={{ title: "Donate" }} />
      <Tabs.Screen name="more" options={{ title: "More" }} />
    </Tabs>
  );
}
