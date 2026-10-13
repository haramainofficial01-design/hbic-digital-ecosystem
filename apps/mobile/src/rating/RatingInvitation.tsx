import { LinearGradient } from "expo-linear-gradient";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, Image } from "../i18n/LocalizedText";
import { AppButton } from "../components/AppButton";
import { brandAssets } from "../constants/assets";
import { colors } from "../theme/theme";
import { useAppTheme } from "../theme/ThemeProvider";

export const ratingInvitationTitle = "Enjoying the Masjid Bilal App? ⭐";
export const ratingInvitationMessage = "Your review helps more people discover our app and stay connected with the masjid. JazakAllahu Khairan for your support!";

/** Android's voluntary invitation. iOS uses StoreKit, never this custom prompt. */
export function RatingInvitation({ visible, onRate, onDismiss }: { visible: boolean; onRate: () => void; onDismiss: () => void }) {
  const { theme } = useAppTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss} statusBarTranslucent>
    <SafeAreaView style={styles.overlay}>
      <Pressable style={StyleSheet.absoluteFill} accessible={false} onPress={onDismiss} />
      <ScrollView contentContainerStyle={styles.center} bounces={false}>
        <View accessibilityViewIsModal style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <LinearGradient colors={[colors.navy, colors.deepNavy]} style={styles.header}>
            <Image source={brandAssets.appMark} style={styles.logo} />
            <Text accessibilityRole="header" style={styles.title}>{ratingInvitationTitle}</Text>
            <View style={styles.goldLine} />
          </LinearGradient>
          <View style={styles.body}>
            <Text style={[styles.message, { color: theme.colors.text }]}>{ratingInvitationMessage}</Text>
            <AppButton label="Rate Our App ⭐" onPress={onRate} />
            <AppButton label="Not Now" variant="ghost" onPress={onDismiss} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(3,24,39,0.65)" },
  center: { flexGrow: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  card: { width: "100%", maxWidth: 440, borderRadius: 28, overflow: "hidden", backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.gold },
  header: { padding: 28, alignItems: "center", gap: 18 },
  logo: { width: 64, height: 64, borderRadius: 18 },
  title: { color: colors.white, textAlign: "center", fontSize: 24, fontWeight: "800", lineHeight: 32 },
  goldLine: { width: 48, height: 3, borderRadius: 2, backgroundColor: colors.gold },
  body: { padding: 24, gap: 12 },
  message: { color: colors.ink, fontSize: 16, lineHeight: 25, textAlign: "center", marginBottom: 8 }
});
