import * as Linking from "expo-linking";
import { useRef, useState } from "react";
import { Pressable, Share, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../../src/i18n/LocalizedText";
import { donationFunds, donationAmountCents, type DonationFund } from "@hbic/shared";
import { AppButton } from "../../src/components/AppButton";
import { AppScreen } from "../../src/components/AppScreen";
import { GlassCard } from "../../src/components/GlassCard";
import { DesktopColumns } from "../../src/components/DesktopColumns";
import { SectionHeader } from "../../src/components/SectionHeader";
import { useAppTheme } from "../../src/theme/ThemeProvider";

export default function DonateScreen() {
  const { theme } = useAppTheme();
  const [fund, setFund] = useState<DonationFund>("general"), [amount, setAmount] = useState("50");
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  async function donate() {
    if (busy) return;
    if (donationAmountCents(amount) === null) { setError("Enter an amount from CA$1 to CA$10,000."); return; }
    setBusy(true); setError("");
    const signature = `${fund}:${amount}`;
    if (attempt.current?.signature !== signature) attempt.current = { signature, id: randomRequestId() };
    try {
      const response = await fetch("https://hbic.ca/api/donations/checkout", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fund, amount, requestId: attempt.current.id }) });
      const body = await response.json();
      if (!response.ok || !body.url?.startsWith("https://checkout.stripe.com/")) throw new Error(body.error ?? "Checkout could not open.");
      await Linking.openURL(body.url);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <AppScreen>
    <SectionHeader title="Donate" subtitle="Support prayer services, education, youth programs and community care." />
    <DesktopColumns>
    <GlassCard>
      <Text style={[styles.title, { color: theme.colors.text }]}>Choose where your donation goes</Text>
      <View style={styles.choices}>{donationFunds.map(category => <Pressable key={category.id} accessibilityRole="radio"
        accessibilityState={{ checked: category.id === fund }} disabled={busy} onPress={() => setFund(category.id)}
        style={[styles.choice, { borderColor: category.id === fund ? theme.colors.teal : theme.colors.border, backgroundColor: category.id === fund ? theme.colors.tintSoft : theme.colors.cardStrong }]}>
        <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{category.title}</Text>
      </Pressable>)}</View>
      <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>{donationFunds.find(c => c.id === fund)?.description}</Text>
      <View style={styles.choices}>{[50, 100, 150].map(value => <AppButton key={value} label={`CA$${value}`} variant={amount === String(value) ? "primary" : "secondary"}
        disabled={busy} onPress={() => setAmount(String(value))} />)}</View>
      <Text style={{ color: theme.colors.text, fontWeight: "700" }}>Custom amount (CAD)</Text>
      <TextInput accessibilityLabel="Custom donation amount in Canadian dollars" keyboardType="decimal-pad" editable={!busy} value={amount}
        onChangeText={setAmount} style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.cardStrong }]} />
      <Text style={{ color: theme.colors.muted, lineHeight: 22 }}>One-time donation. Your category is recorded with your payment. Card details are collected securely by Stripe.</Text>
      <AppButton label={busy ? "Opening secure Checkout…" : `Donate CA$${amount || "0"}`} icon="card" disabled={busy} onPress={() => void donate()} />
      {error ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{error}</Text> : null}
    </GlassCard>
    <GlassCard><Text style={[styles.title, { color: theme.colors.text }]}>E-transfer</Text>
      <Text style={{ color: theme.colors.muted }}>bilalislamiccentrecalgary@gmail.com</Text>
      <AppButton label="Share / Copy E-transfer Email" variant="secondary" icon="copy" onPress={() => void Share.share({ message: "bilalislamiccentrecalgary@gmail.com" })} />
    </GlassCard>
    </DesktopColumns>
  </AppScreen>;
}
function randomRequestId() { return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { const n = Math.floor(Math.random() * 16); return (c === "x" ? n : (n & 3) | 8).toString(16); }); }
const styles = StyleSheet.create({ title: { fontSize: 22, fontWeight: "800" }, choices: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 16 },
  choice: { padding: 14, borderWidth: 1, borderRadius: 16 }, input: { minHeight: 52, padding: 14, borderWidth: 1, borderRadius: 14, fontSize: 20, marginVertical: 12 } });
