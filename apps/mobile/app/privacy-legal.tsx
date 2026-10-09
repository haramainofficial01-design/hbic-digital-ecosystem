import { privacyContactEmail, privacyPolicyEffectiveDate, privacyPolicyUrl } from "@hbic/shared";
import { useRouter } from "expo-router";
import { Linking, StyleSheet } from "react-native";
import { Text } from "../src/i18n/LocalizedText";
import { AppButton } from "../src/components/AppButton";
import { AppScreen } from "../src/components/AppScreen";
import { GlassCard } from "../src/components/GlassCard";
import { SectionHeader } from "../src/components/SectionHeader";
import { spacing } from "../src/theme/theme";
import { useAppTheme } from "../src/theme/ThemeProvider";

export default function PrivacyLegalScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();

  return (
    <AppScreen>
      <AppButton label="Back" icon="chevron-back" variant="ghost" onPress={() => router.back()} />
      <SectionHeader title="Privacy & Legal" subtitle="Clear information about your choices and the data used by Masjid Bilal." />

      <GlassCard tone="navy">
        <Text style={styles.darkTitle}>Privacy Policy</Text>
        <Text style={styles.darkBody}>Effective {privacyPolicyEffectiveDate}</Text>
        <Text style={styles.darkBody}>
          Read the complete policy for the Masjid Bilal app and Hazrat Bilal Islamic Centre website.
        </Text>
        <AppButton
          label="Open Privacy Policy"
          icon="open-outline"
          onPress={() => void Linking.openURL(privacyPolicyUrl)}
          accessibilityHint="Opens the public Masjid Bilal privacy policy"
          style={styles.button}
        />
      </GlassCard>

      <GlassCard>
        <Text style={[styles.title, { color: theme.colors.text }]}>Your choices</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>You can use prayer times and public community content without creating an account.</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>Notification permission is optional. The Notifications screen lets you change categories or remove this device from notification delivery.</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>Private web submissions can be corrected or deleted by contacting the centre from the email address used in the form.</Text>
      </GlassCard>

      <GlassCard compact>
        <Text style={[styles.title, { color: theme.colors.text }]}>Privacy contact</Text>
        <Text style={[styles.body, { color: theme.colors.muted }]}>{privacyContactEmail}</Text>
        <AppButton
          label="Email the Centre"
          icon="mail"
          variant="secondary"
          onPress={() => void Linking.openURL(`mailto:${privacyContactEmail}?subject=Masjid%20Bilal%20Privacy%20Request`)}
          style={styles.button}
        />
      </GlassCard>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  darkTitle: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  darkBody: { color: "rgba(255,255,255,0.84)", lineHeight: 22, marginTop: 8 },
  title: { fontSize: 20, fontWeight: "900", marginBottom: spacing.sm },
  body: { lineHeight: 21, marginBottom: 10 },
  button: { marginTop: spacing.md }
});
