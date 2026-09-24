import { getPublicEvents, getPublicVolunteerOpportunities, type ProgramCategory } from "@hbic/shared";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { AdaptiveGrid } from "../../src/components/AdaptiveGrid";
import { AppScreen } from "../../src/components/AppScreen";
import { EventCard } from "../../src/components/EventCard";
import { EmptyState } from "../../src/components/EmptyState";
import { GlassCard } from "../../src/components/GlassCard";
import { SectionHeader } from "../../src/components/SectionHeader";
import { usePublishedContent } from "../../src/services/content";
import { spacing } from "../../src/theme/theme";
import { useAppTheme } from "../../src/theme/ThemeProvider";

const baseFilters = ["All", "Youth", "Sisters", "Classes", "Lectures", "Volunteer"] as const;
type Filter = (typeof baseFilters)[number] | "Ramadan";

export default function EventsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const { settings } = content;
  const volunteerOpportunities = getPublicVolunteerOpportunities(content.volunteerOpportunities);
  const publishedEvents = getPublicEvents(content);
  const filters = useMemo<Filter[]>(() => (settings.ramadanMode ? [...baseFilters, "Ramadan"] : [...baseFilters]), [settings.ramadanMode]);
  const [filter, setFilter] = useState<Filter>("All");
  const events = useMemo(
    () => (filter === "All" ? publishedEvents : publishedEvents.filter((event) => event.category === (filter as ProgramCategory))),
    [filter, publishedEvents]
  );

  return (
    <AppScreen>
      <SectionHeader title="Events & Programs" subtitle="Halaqah series, youth activities, summer camp, volunteer needs, and community gatherings." />
      <View style={styles.chips}>
        {filters.map((item) => {
          const active = filter === item;
          return (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityLabel={`Show ${item} events`}
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(item)}
              style={[styles.chip, { backgroundColor: active ? theme.colors.teal : theme.colors.cardStrong, borderColor: theme.colors.border }]}
            >
              <Text style={[styles.chipText, { color: active ? theme.colors.white : theme.colors.text }]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      <AdaptiveGrid>
        {events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            compact
            onPress={() => router.push({ pathname: "/event-detail", params: { id: event.id } } as never)}
          />
        ))}
      </AdaptiveGrid>
      {!events.length ? (
        <EmptyState title="No events in this category" message="Choose another category or check back for new community updates." />
      ) : null}

      <SectionHeader title="Volunteer" subtitle="Help with Jumu'ah, youth, events, and general community support." />
      <AdaptiveGrid>
        {volunteerOpportunities.map((opportunity) => (
          <GlassCard key={opportunity.id}>
            <Text style={[styles.title, { color: theme.colors.text }]}>{opportunity.title}</Text>
            <Text style={[styles.body, { color: theme.colors.muted }]}>{opportunity.description}</Text>
            <Text style={[styles.meta, { color: theme.colors.teal }]}>
              {opportunity.date} · {opportunity.audience}
            </Text>
            <AppButton
              label="Email to Help"
              icon="mail"
              variant="secondary"
              onPress={() => Linking.openURL(`mailto:${opportunity.contactEmail || settings.email}?subject=${encodeURIComponent(opportunity.title)}`)}
              style={styles.button}
            />
          </GlassCard>
        ))}
      </AdaptiveGrid>
      {!volunteerOpportunities.length ? (
        <EmptyState title="No volunteer calls right now" message="New opportunities will appear here when help is needed." icon="hand-left-outline" />
      ) : null}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1
  },
  chipText: {
    fontWeight: "800"
  },
  title: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6
  },
  body: {
    lineHeight: 21
  },
  meta: {
    fontWeight: "800",
    marginTop: spacing.sm
  },
  button: {
    marginTop: spacing.md
  }
});
