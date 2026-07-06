import * as Linking from "expo-linking";
import { Share, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../../src/components/AppButton";
import { AppScreen } from "../../src/components/AppScreen";
import { GlassCard } from "../../src/components/GlassCard";
import { SectionHeader } from "../../src/components/SectionHeader";
import { usePublishedContent } from "../../src/services/content";
import { spacing } from "../../src/theme/theme";
import { useAppTheme } from "../../src/theme/ThemeProvider";

const etransferEmail = "bilalislamiccentrecalgary@gmail.com";

export default function DonateScreen() {
  const { theme } = useAppTheme();
  const { content } = usePublishedContent();
  const { donationCategories, settings } = content;

  return (
    <AppScreen>
      <SectionHeader title="Donate" subtitle="Support prayer services, classes, youth programs, operations, and community work." />
      <GlassCard tone="navy">
        <Text style={styles.darkKicker}>HBIC Calgary</Text>
        <Text style={styles.darkTitle}>Support the masjid</Text>
        <Text style={styles.darkBody}>
          Donate by PayPal or credit card, or use e-transfer to {etransferEmail}.
        </Text>
        <AppButton label="Donate by PayPal / Credit Card" icon="card" onPress={() => Linking.openURL(settings.donationUrl)} style={styles.button} />
        <AppButton
          label="Share / Copy E-transfer Email"
          icon="copy"
          variant="secondary"
          onPress={() => Share.share({ message: etransferEmail })}
          style={styles.button}
        />
        <AppButton
          label="Open E-transfer Email"
          icon="mail"
          variant="secondary"
          onPress={() => Linking.openURL(`mailto:${etransferEmail}?subject=HBIC%20Donation`)}
          style={styles.button}
        />
      </GlassCard>

      <GlassCard tone="gold">
        <Text style={[styles.title, { color: theme.colors.text }]}>Donation notes</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>
          For donation receipts, e-transfer questions, or giving by another method, contact the HBIC office.
        </Text>
      </GlassCard>

      {donationCategories.map((category) => (
        <GlassCard key={category.id} tone={category.id === "ramadan" && settings.ramadanMode ? "gold" : "light"}>
          <Text style={[styles.title, { color: theme.colors.text }]}>{category.title}</Text>
          <Text style={[styles.body, { color: theme.colors.muted }]}>{category.description}</Text>
          <View style={styles.amounts}>
            {category.amountSuggestions.map((amount) => (
              <Text key={amount} style={[styles.amount, { backgroundColor: theme.colors.tintSoft, color: theme.colors.navy }]}>${amount}</Text>
            ))}
          </View>
        </GlassCard>
      ))}
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  darkKicker: {
    color: "#E7C66B",
    fontWeight: "900",
    marginBottom: 6
  },
  darkTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900"
  },
  darkBody: {
    color: "rgba(255,255,255,0.82)",
    lineHeight: 22,
    marginTop: 8
  },
  button: {
    marginTop: spacing.md
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 6
  },
  body: {
    lineHeight: 21
  },
  amounts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  amount: {
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontWeight: "900"
  }
});
