import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { isVisibleItem } from "@hbic/shared";
import { AppButton } from "../src/components/AppButton";
import { AdaptiveGrid } from "../src/components/AdaptiveGrid";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { EmptyState } from "../src/components/EmptyState";
import { SectionHeader } from "../src/components/SectionHeader";
import { usePublishedContent } from "../src/services/content";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function ProgramsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const programs = content.programs.filter(isVisibleItem);

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Programs" subtitle="Qur'an classes, youth, sisters' programs, volunteer opportunities, and community support." />

      <AdaptiveGrid>
        {programs.map((service) => (
          <GlassCard key={service.id}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{service.title}</Text>
            <Text style={[styles.body, { color: theme.colors.muted }]}>{service.description}</Text>
            <AppButton
              label={service.contactMethod === "phone" ? "Call Office" : service.contactMethod === "form" ? "Email to Ask" : "Email Office"}
              icon={service.contactMethod === "phone" ? "call" : "mail"}
              variant="secondary"
              onPress={() => Linking.openURL(service.contactMethod === "phone" ? `tel:${content.settings.phone}` : `mailto:${content.settings.email}?subject=${encodeURIComponent(service.title)}`)}
              style={styles.button}
            />
          </GlassCard>
        ))}
      </AdaptiveGrid>
      {!programs.length ? (
        <EmptyState title="No programs listed right now" message="Please check back or contact the office for current programs." icon="book-outline" />
      ) : null}

      <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>Seasonal programs</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          Ramadan, Taraweeh, Eid, and fundraiser sections appear when active, keeping the app focused during regular weeks.
        </Text>
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6
  },
  body: {
    lineHeight: 21
  },
  button: {
    marginTop: spacing.md
  }
});
